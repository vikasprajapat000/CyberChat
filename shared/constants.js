// shared/constants.js

const SOCKET_EVENTS = {
  // Connection and Status
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECTION_STATE: 'connection_state',
  
  // User Management
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_LIST_UPDATE: 'user_list_update',
  
  // Room Management
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  ROOM_LIST_UPDATE: 'room_list_update',
  ROOM_MEMBERS_UPDATE: 'room_members_update',
  
  // Messaging
  SEND_MESSAGE: 'send_message',
  RECEIVE_MESSAGE: 'receive_message',
  EDIT_MESSAGE: 'edit_message',
  DELETE_MESSAGE: 'delete_message',
  PIN_MESSAGE: 'pin_message',
  
  // Interactions & Indicators
  TYPING: 'typing',
  TYPING_UPDATE: 'typing_update',
  
  // Privacy
  BLOCK_USER: 'block_user',
  MUTE_USER: 'mute_user',
  REPORT_USER: 'report_user',
  
  // Special Screen Recording / Screenshots
  REPORT_SCREENSHOT: 'report_screenshot',
  SCREENSHOT_REPORTED: 'screenshot_reported',
  
  // System Messages
  SYSTEM_NOTIFICATION: 'system_notification'
};

const DEFAULT_ROOMS = [
  { id: 'room_general', name: 'General Chat', type: 'group', creatorId: 'system', members: [] },
  { id: 'room_gaming', name: 'Gaming Zone', type: 'group', creatorId: 'system', members: [] },
  { id: 'room_tech', name: 'Tech Talk', type: 'group', creatorId: 'system', members: [] }
];

module.exports = {
  SOCKET_EVENTS,
  DEFAULT_ROOMS
};
