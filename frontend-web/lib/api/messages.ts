import apiClient from './client';
import { Message, MessageGroup, Conversation, User, MessageGroupType } from '@/lib/types';

export interface SendMessageData {
  receiver_id: number;
  content?: string;
  file?: File;
}

export interface CreateGroupData {
  name: string;
  type: MessageGroupType;
  program_id?: number;
  class_id?: number;
  member_ids?: number[];
  students_can_write?: boolean;
}

export interface UpdateGroupData {
  name?: string;
  students_can_write?: boolean;
}

export const messagesApi = {
  // ==================== Direct Messages ====================

  /**
   * Get list of conversations (users with whom messages have been exchanged)
   */
  getConversations: async (): Promise<Conversation[]> => {
    const response = await apiClient.get('/messages/conversations');
    return response.data.conversations;
  },

  /**
   * Get messages with a specific user
   */
  getMessagesWithUser: async (userId: number): Promise<{ messages: Message[]; other_user: User }> => {
    const response = await apiClient.get(`/messages/users/${userId}`);
    return response.data;
  },

  /**
   * Send a message to a user (with optional file attachment)
   */
  send: async (data: SendMessageData): Promise<Message> => {
    if (data.file) {
      const formData = new FormData();
      formData.append('receiver_id', String(data.receiver_id));
      if (data.content) formData.append('content', data.content);
      formData.append('file', data.file);
      const response = await apiClient.post('/messages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data;
    }
    const response = await apiClient.post('/messages', { receiver_id: data.receiver_id, content: data.content });
    return response.data.data;
  },

  /**
   * Get unread messages count
   */
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get('/messages/unread-count');
    return response.data.unread_count;
  },

  /**
   * Mark all messages from a user as read
   */
  markAsRead: async (userId: number): Promise<void> => {
    await apiClient.post(`/messages/users/${userId}/mark-read`);
  },

  /**
   * Get list of users available for messaging
   */
  getAvailableUsers: async (): Promise<User[]> => {
    const response = await apiClient.get('/messages/available-users');
    return response.data.users;
  },

  // ==================== Group Messages ====================

  /**
   * Get list of message groups the user is member of
   */
  getGroups: async (): Promise<MessageGroup[]> => {
    const response = await apiClient.get('/messages/groups');
    return response.data.groups;
  },

  /**
   * Create a new message group
   */
  createGroup: async (data: CreateGroupData): Promise<MessageGroup> => {
    const response = await apiClient.post('/messages/groups', data);
    return response.data.group;
  },

  /**
   * Get a specific group with messages
   */
  getGroup: async (groupId: number): Promise<{ group: MessageGroup; messages: Message[] }> => {
    const response = await apiClient.get(`/messages/groups/${groupId}`);
    return response.data;
  },

  /**
   * Send a message to a group (with optional file attachment)
   */
  sendToGroup: async (groupId: number, content: string, file?: File): Promise<Message> => {
    if (file) {
      const formData = new FormData();
      if (content) formData.append('content', content);
      formData.append('file', file);
      const response = await apiClient.post(`/messages/groups/${groupId}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data;
    }
    const response = await apiClient.post(`/messages/groups/${groupId}/messages`, { content });
    return response.data.data;
  },

  /**
   * Add members to a group
   */
  addGroupMembers: async (groupId: number, memberIds: number[]): Promise<void> => {
    await apiClient.post(`/messages/groups/${groupId}/members`, { member_ids: memberIds });
  },

  /**
   * Remove a member from a group
   */
  removeGroupMember: async (groupId: number, userId: number): Promise<void> => {
    await apiClient.delete(`/messages/groups/${groupId}/members/${userId}`);
  },

  /**
   * Update a group
   */
  updateGroup: async (groupId: number, data: UpdateGroupData): Promise<MessageGroup> => {
    const response = await apiClient.put(`/messages/groups/${groupId}`, data);
    return response.data.group;
  },

  /**
   * Delete a group
   */
  deleteGroup: async (groupId: number): Promise<void> => {
    await apiClient.delete(`/messages/groups/${groupId}`);
  },
};

export default messagesApi;
