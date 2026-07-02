import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface CertificateData {
  studentName: string;
  courseName: string;
  date: string;
}

const CertificateGenerator: React.FC = () => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CertificateData>({
    studentName: 'João Silva',
    courseName: 'Desenvolvimento React Avançado',
    date: new Date().toLocaleDateString('pt-BR')
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generatePDF = async () => {
    if (!certificateRef.current) {
      alert('Erro: Elemento do certificado não encontrado');
      return;
    }

    setIsLoading(true);
    
    try {
      // Configurações para capturar o certificado com alta qualidade
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2, // Alta resolução
        useCORS: true, // Permite carregar imagens externas
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      // Configuração do PDF (paisagem, tamanho A4)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Adiciona a imagem ao PDF
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('certificado.pdf');
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Ocorreu um erro ao gerar o PDF. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="certificate-container">
      <div className="form-section">
        <h2>Gerar Certificado</h2>
        <div className="form-group">
          <label>Nome do Aluno:</label>
          <input
            type="text"
            name="studentName"
            value={formData.studentName}
            onChange={handleInputChange}
            placeholder="Digite o nome do aluno"
          />
        </div>
        <div className="form-group">
          <label>Nome do Curso:</label>
          <input
            type="text"
            name="courseName"
            value={formData.courseName}
            onChange={handleInputChange}
            placeholder="Digite o nome do curso"
          />
        </div>
        <button 
          onClick={generatePDF} 
          disabled={isLoading}
          className="generate-btn"
        >
          {isLoading ? 'Gerando...' : 'Baixar Certificado'}
        </button>
      </div>

      {/* Certificado (oculto na visualização, mas renderizado para captura) */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div 
          ref={certificateRef} 
          className="certificate"
          style={{
            width: '794px', // A4 landscape
            height: '562px',
            padding: '40px',
            backgroundColor: '#ffffff',
            border: '10px solid #1a73e8',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            fontFamily: 'Arial, sans-serif'
          }}
        >
          <div style={{ 
            width: '100%', 
            borderBottom: '3px solid #1a73e8',
            paddingBottom: '20px',
            marginBottom: '20px'
          }}>
            <h1 style={{ 
              fontSize: '48px', 
              color: '#1a73e8',
              margin: 0,
              letterSpacing: '4px'
            }}>
              CERTIFICADO
            </h1>
          </div>
          
          <p style={{ fontSize: '20px', color: '#555' }}>
            Certificamos que
          </p>
          
          <h2 style={{ 
            fontSize: '36px', 
            color: '#1a1a1a',
            margin: '10px 0',
            textTransform: 'uppercase'
          }}>
            {formData.studentName}
          </h2>
          
          <p style={{ fontSize: '18px', color: '#555' }}>
            concluiu com sucesso o curso
          </p>
          
          <h3 style={{ 
            fontSize: '28px', 
            color: '#1a73e8',
            margin: '10px 0'
          }}>
            {formData.courseName}
          </h3>
          
          <div style={{ 
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '2px solid #e0e0e0',
            width: '80%'
          }}>
            <p style={{ fontSize: '14px', color: '#888' }}>
              Emitido em {formData.date}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .certificate-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Arial', sans-serif;
        }

        .form-section {
          background: #f8f9fa;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .form-section h2 {
          color: #1a1a1a;
          margin-bottom: 20px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 600;
          color: #333;
        }

        .form-group input {
          width: 100%;
          padding: 10px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          font-size: 16px;
          transition: border-color 0.3s;
        }

        .form-group input:focus {
          border-color: #1a73e8;
          outline: none;
        }

        .generate-btn {
          width: 100%;
          padding: 12px;
          background: #1a73e8;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.3s;
        }

        .generate-btn:hover:not(:disabled) {
          background: #1557b0;
        }

        .generate-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default CertificateGenerator;
