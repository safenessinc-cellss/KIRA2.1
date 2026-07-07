// src/components/ChatWidget.tsx (sección corregida)

// Listen to custom events for opening chat
useEffect(() => {
  // Handler para el evento existente 'open-kira-chat'
  const handleOpenKiraChat = (e: Event) => {
    const customEvent = e as CustomEvent;
    const coach = customEvent.detail?.coach;
    if (coach) {
      const resolvedCoach = {
        uid: coach.uid || coach.id,
        displayName: coach.displayName,
        photoURL: coach.photoURL,
        ...coach
      };
      setManualContacts(prev => {
        if (!prev.some(c => c.uid === resolvedCoach.uid)) {
          return [resolvedCoach, ...prev];
        }
        return prev;
      });
      setSelectedContact(resolvedCoach);
      setIsOpen(true);
    }
  };

  // Handler para el evento 'open-mentor-chat' (usado en el Dashboard)
  const handleOpenMentorChat = (e: Event) => {
    const customEvent = e as CustomEvent;
    const mentor = customEvent.detail;
    if (mentor) {
      const resolvedMentor = {
        uid: mentor.id || mentor.uid,
        displayName: mentor.displayName,
        photoURL: mentor.photoURL,
        specialty: mentor.specialty,
        role: mentor.role || 'coach',
        ...mentor
      };
      setManualContacts(prev => {
        if (!prev.some(c => c.uid === resolvedMentor.uid)) {
          return [resolvedMentor, ...prev];
        }
        return prev;
      });
      setSelectedContact(resolvedMentor);
      setIsOpen(true);
    }
  };

  // Registrar ambos listeners
  window.addEventListener('open-kira-chat', handleOpenKiraChat);
  window.addEventListener('open-mentor-chat', handleOpenMentorChat);

  return () => {
    window.removeEventListener('open-kira-chat', handleOpenKiraChat);
    window.removeEventListener('open-mentor-chat', handleOpenMentorChat);
  };
}, []);
