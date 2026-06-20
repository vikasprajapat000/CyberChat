// frontend/src/components/ChatLayout.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import AdminDashboard from './AdminDashboard';
import UserProfileModal from './UserProfileModal';
import SettingsPage from './SettingsPage';

function ChatLayout({
  user,
  socket,
  connected,
  connectionError,
  latencyQuality,
  rooms,
  messages,
  onlineUsers,
  activeChat,
  setActiveChat,
  typingUsers,
  unreadCounts,
  soundEnabled,
  setSoundEnabled,
  notificationsPermission,
  requestNotificationPermission,
  theme,
  toggleTheme,
  logout,
  showToast,
  analyticsData,
  onStartCall
}) {
  const [inspectedUser, setInspectedUser] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [activeTab, setActiveTab] = useState('chats'); // chats, starred, admin

  // Resize handler for responsive panels
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleInspectUser = (userId) => {
    const found = onlineUsers.find(u => u.id === userId);
    if (found) {
      setInspectedUser(found);
    } else {
      setInspectedUser({ id: userId, username: 'Offline Contact', status: 'offline', isMutedGlobally: false });
    }
  };

  // Determine what to render in main workspace
  const renderWorkspace = () => {
    if (activeTab === 'admin' && user.isAdmin) {
      return (
        <AdminDashboard
          user={user}
          socket={socket}
          connected={connected}
          analyticsData={analyticsData}
          rooms={rooms}
          onlineUsers={onlineUsers}
          showToast={showToast}
          messages={messages}
        />
      );
    }
    if (activeTab === 'settings') {
      return (
        <SettingsPage
          user={user}
          socket={socket}
          connected={connected}
          theme={theme}
          toggleTheme={toggleTheme}
          showToast={showToast}
          messages={messages}
          setActiveTab={setActiveTab}
        />
      );
    }

    return (
      <ChatArea
        user={user}
        socket={socket}
        connected={connected}
        latencyQuality={latencyQuality}
        activeChat={activeChat}
        setActiveChat={setActiveChat}
        messages={messages}
        typingUsers={typingUsers[activeChat?.id] || []}
        onlineUsers={onlineUsers}
        onInspectUser={handleInspectUser}
        isMobile={isMobile}
        theme={theme}
        toggleTheme={toggleTheme}
        showToast={showToast}
        rooms={rooms}
        onStartCall={onStartCall}
      />
    );
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      backgroundColor: 'var(--bg-app)',
      color: 'var(--text-primary)',
      overflow: 'hidden'
    }}>
      {/* Sidebar Panel Column */}
      {(!isMobile || (!activeChat && activeTab !== 'admin')) && (
        <div style={{
          width: isMobile ? '100%' : '440px', // slightly wider sidebar to fit mini-nav tab cleanly
          height: '100%',
          flexShrink: 0
        }}>
          <Sidebar
            user={user}
            connected={connected}
            connectionError={connectionError}
            rooms={rooms}
            onlineUsers={onlineUsers}
            activeChat={activeChat}
            setActiveChat={setActiveChat}
            typingUsers={typingUsers}
            unreadCounts={unreadCounts}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            notificationsPermission={notificationsPermission}
            requestNotificationPermission={requestNotificationPermission}
            logout={logout}
            socket={socket}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            showToast={showToast}
            messages={messages}
            isMobile={isMobile}
          />
        </div>
      )}

      {/* Main Workspace Column */}
      {(!isMobile || (activeChat || activeTab === 'admin' || activeTab === 'settings')) && (
        <div style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-chat)'
        }}>
          {renderWorkspace()}
        </div>
      )}

      {/* User Profile Modal Trigger */}
      {inspectedUser && (
        <UserProfileModal
          user={user}
          targetUser={inspectedUser}
          onClose={() => setInspectedUser(null)}
          socket={socket}
          connected={connected}
        />
      )}
    </div>
  );
}

export default ChatLayout;
