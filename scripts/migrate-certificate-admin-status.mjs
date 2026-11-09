#!/usr/bin/env node
/**
 * Idempotent certificate lifecycle backfill.
 * Dry-run is the default. Pass --apply to write.
 * Uses adminStatus instead of changing signed payload fields such as status,
 * because legacy HMAC signatures cover the original certificate payload.
 */
import { createSign } from 'node:crypto';

const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON||process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
if(!raw){console.error('Missing FIREBASE_SERVICE_ACCOUNT_JSON / GOOGLE_SERVICE_ACCOUNT_JSON');process.exit(1);}
const account=JSON.parse(raw);account.private_key=String(account.private_key||'').replace(/\\n/g,'\n');
const projectId=process.env.FIREBASE_PROJECT_ID||account.project_id;
if(!projectId||account.project_id!==projectId)throw new Error('Firebase project mismatch.');
const b64=value=>Buffer.from(value).toString('base64url');
async function token(){
 const now=Math.floor(Date.now()/1000),unsigned=b64(JSON.stringify({alg:'RS256',typ:'JWT'}))+'.'+b64(JSON.stringify({iss:account.client_email,scope:'https://www.googleapis.com/auth/datastore',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600}));
 const signer=createSign('RSA-SHA256');signer.update(unsigned);signer.end();
 const assertion=unsigned+'.'+b64(signer.sign(account.private_key));
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
 if(!response.ok)throw new Error('Service account token exchange failed.');
 return (await response.json()).access_token;
}
const accessToken=await token();
const encode=v=>v===null?{nullValue:null}:typeof v==='string'?{stringValue:v}:typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?{doubleValue:v}:{stringValue:String(v)};
let pageToken='',scanned=0,eligible=0,updated=0;
do{
 const url=new URL('https://firestore.googleapis.com/v1/projects/'+projectId+'/databases/(default)/documents/certificates');
 url.searchParams.set('pageSize','500');if(pageToken)url.searchParams.set('pageToken',pageToken);
 const response=await fetch(url,{headers:{Authorization:'Bearer '+accessToken}});
 if(!response.ok)throw new Error('Certificate list failed: '+response.status);
 const result=await response.json();pageToken=result.nextPageToken||'';
 for(const doc of result.documents||[]){
  scanned++;
  if(doc.fields?.adminStatus)continue;
  eligible++;
  const id=doc.name.split('/').pop();
  console.log((process.argv.includes('--apply')?'APPLY':'DRY-RUN')+' '+id+' -> adminStatus=active');
  if(process.argv.includes('--apply')){
   const endpoint='https://firestore.googleapis.com/v1/projects/'+projectId+'/databases/(default)/documents:commit';
   const fields={adminStatus:encode('active'),requiresManualApproval:encode(false)};
   const write={update:{name:doc.name,fields},updateMask:{fieldPaths:['adminStatus','requiresManualApproval']}};
   const saved=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({writes:[write]})});
   if(!saved.ok)throw new Error('Backfill failed for '+id+': '+saved.status);
   updated++;
  }
 }
}while(pageToken);
console.log(JSON.stringify({mode:process.argv.includes('--apply')?'apply':'dry-run',scanned,eligible,updated},null,2));
