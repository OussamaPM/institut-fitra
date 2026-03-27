'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { messagesApi, classesApi } from '@/lib/api';
import { Message, Conversation, User, MessageGroup, ClassModel, ClassStudent } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserAvatar } from '@/components/ui';
import { Paperclip, X, FileText, Music, Download, Send } from 'lucide-react';

type ViewType = 'list' | 'chat' | 'new' | 'group-chat' | 'create-group' | 'group-settings';
type CreateGroupStep = 1 | 2 | 3 | 4 | 5 | 6;

export default function AdminMessages() {
  const { user } = useAuth();
  const [view, setView] = useState<ViewType>('list');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groups, setGroups] = useState<MessageGroup[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<MessageGroup | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'direct' | 'groups'>('direct');
  const [searchQuery, setSearchQuery] = useState('');

  // Create group form - multi-step
  const [createGroupStep, setCreateGroupStep] = useState<CreateGroupStep>(1);
  const [newGroupName, setNewGroupName] = useState('');
  const [allClasses, setAllClasses] = useState<ClassModel[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [classStudents, setClassStudents] = useState<ClassStudent[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [studentsCanWrite, setStudentsCanWrite] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // Edit group form
  const [editGroupName, setEditGroupName] = useState('');
  const [editStudentsCanWrite, setEditStudentsCanWrite] = useState(false);
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  // Add members to existing group
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [availableStudentsForGroup, setAvailableStudentsForGroup] = useState<User[]>([]);
  const [selectedNewMembers, setSelectedNewMembers] = useState<number[]>([]);
  const [isLoadingGroupMembers, setIsLoadingGroupMembers] = useState(false);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState<number | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    e.target.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [convs, grps, count, users] = await Promise.all([
        messagesApi.getConversations(),
        messagesApi.getGroups(),
        messagesApi.getUnreadCount(),
        messagesApi.getAvailableUsers(),
      ]);
      setConversations(convs);
      setGroups(grps);
      setUnreadCount(count);
      setAvailableUsers(users);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openChat = async (otherUser: User) => {
    try {
      setSelectedUser(otherUser);
      setView('chat');
      const data = await messagesApi.getMessagesWithUser(otherUser.id);
      setMessages(data.messages);
      const count = await messagesApi.getUnreadCount();
      setUnreadCount(count);
      const convs = await messagesApi.getConversations();
      setConversations(convs);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const openGroupChat = async (group: MessageGroup) => {
    try {
      setSelectedGroup(group);
      setView('group-chat');
      const data = await messagesApi.getGroup(group.id);
      setMessages(data.messages);
      const grps = await messagesApi.getGroups();
      setGroups(grps);
    } catch (err) {
      console.error('Error loading group messages:', err);
    }
  };

  const startNewConversation = () => {
    setView('new');
  };

  const startCreateGroup = async () => {
    setNewGroupName('');
    setSelectedClassId(null);
    setClassStudents([]);
    setSelectedMembers([]);
    setStudentsCanWrite(false);
    setCreateGroupStep(1);
    setView('create-group');

    // Load classes
    setIsLoadingClasses(true);
    try {
      const response = await classesApi.getAll({ per_page: 100 });
      setAllClasses(response.data);
    } catch (err) {
      console.error('Error loading classes:', err);
    } finally {
      setIsLoadingClasses(false);
    }
  };

  const openGroupSettings = async (group: MessageGroup) => {
    setSelectedGroup(group);
    setEditGroupName(group.name);
    setEditStudentsCanWrite(group.students_can_write || false);
    setShowAddMembers(false);
    setSelectedNewMembers([]);
    setMemberSearchQuery('');
    setView('group-settings');

    // Load group details with members
    setIsLoadingGroupMembers(true);
    try {
      const data = await messagesApi.getGroup(group.id);
      setGroupMembers(data.group.users || []);
      // Filter available users to show only students not in the group
      const memberIds = (data.group.users || []).map((u: User) => u.id);
      const students = availableUsers.filter(u => u.role === 'student' && !memberIds.includes(u.id));
      setAvailableStudentsForGroup(students);
    } catch (err) {
      console.error('Error loading group members:', err);
    } finally {
      setIsLoadingGroupMembers(false);
    }
  };

  const selectNewUser = (newUser: User) => {
    openChat(newUser);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() && !selectedFile) return;

    setIsSending(true);
    try {
      if (view === 'chat' && selectedUser) {
        const newMessage = await messagesApi.send({
          receiver_id: selectedUser.id,
          content: messageContent,
          file: selectedFile ?? undefined,
        });
        setMessages([...messages, newMessage]);
        const convs = await messagesApi.getConversations();
        setConversations(convs);
      } else if (view === 'group-chat' && selectedGroup) {
        const newMessage = await messagesApi.sendToGroup(selectedGroup.id, messageContent, selectedFile ?? undefined);
        setMessages([...messages, newMessage]);
        const grps = await messagesApi.getGroups();
        setGroups(grps);
      }
      setMessageContent('');
      setSelectedFile(null);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Step navigation for group creation
  const goToStep = (step: CreateGroupStep) => {
    setCreateGroupStep(step);
  };

  const nextStep = async () => {
    if (createGroupStep === 1 && newGroupName.trim()) {
      setCreateGroupStep(2);
    } else if (createGroupStep === 2 && selectedClassId) {
      // Load students for selected class
      setIsLoadingStudents(true);
      try {
        const students = await classesApi.getStudents(selectedClassId);
        setClassStudents(students);
        setCreateGroupStep(3);
      } catch (err) {
        console.error('Error loading students:', err);
      } finally {
        setIsLoadingStudents(false);
      }
    } else if (createGroupStep === 3) {
      setCreateGroupStep(4);
    } else if (createGroupStep === 4) {
      setCreateGroupStep(5);
    } else if (createGroupStep === 5) {
      setCreateGroupStep(6);
    }
  };

  const prevStep = () => {
    if (createGroupStep > 1) {
      setCreateGroupStep((createGroupStep - 1) as CreateGroupStep);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim() || !selectedClassId) return;

    setIsCreatingGroup(true);
    try {
      await messagesApi.createGroup({
        name: newGroupName,
        type: 'class',
        class_id: selectedClassId,
        member_ids: selectedMembers,
        students_can_write: studentsCanWrite,
      });
      const grps = await messagesApi.getGroups();
      setGroups(grps);
      setView('list');
      setActiveTab('groups');
    } catch (err) {
      console.error('Error creating group:', err);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const saveGroupSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !editGroupName.trim()) return;

    setIsSavingGroup(true);
    try {
      await messagesApi.updateGroup(selectedGroup.id, {
        name: editGroupName,
        students_can_write: editStudentsCanWrite,
      });
      const grps = await messagesApi.getGroups();
      setGroups(grps);
      const updatedGroup = grps.find(g => g.id === selectedGroup.id);
      if (updatedGroup) {
        setSelectedGroup(updatedGroup);
      }
      setView('list');
      setActiveTab('groups');
    } catch (err) {
      console.error('Error updating group:', err);
    } finally {
      setIsSavingGroup(false);
    }
  };

  const deleteGroup = async (groupId: number) => {
    if (!confirm('Etes-vous sur de vouloir supprimer ce groupe ?')) return;
    try {
      await messagesApi.deleteGroup(groupId);
      const grps = await messagesApi.getGroups();
      setGroups(grps);
      if (selectedGroup?.id === groupId) {
        setView('list');
        setSelectedGroup(null);
      }
    } catch (err) {
      console.error('Error deleting group:', err);
    }
  };

  const addMembersToGroup = async () => {
    if (!selectedGroup || selectedNewMembers.length === 0) return;

    setIsAddingMembers(true);
    try {
      await messagesApi.addGroupMembers(selectedGroup.id, selectedNewMembers);
      // Reload group data
      const data = await messagesApi.getGroup(selectedGroup.id);
      setGroupMembers(data.group.users || []);
      const memberIds = (data.group.users || []).map((u: User) => u.id);
      const students = availableUsers.filter(u => u.role === 'student' && !memberIds.includes(u.id));
      setAvailableStudentsForGroup(students);
      setSelectedNewMembers([]);
      setShowAddMembers(false);
      // Update groups list
      const grps = await messagesApi.getGroups();
      setGroups(grps);
    } catch (err) {
      console.error('Error adding members:', err);
    } finally {
      setIsAddingMembers(false);
    }
  };

  const removeMemberFromGroup = async (userId: number) => {
    if (!selectedGroup) return;
    if (!confirm('Retirer ce membre du groupe ?')) return;

    setIsRemovingMember(userId);
    try {
      await messagesApi.removeGroupMember(selectedGroup.id, userId);
      // Reload group data
      const data = await messagesApi.getGroup(selectedGroup.id);
      setGroupMembers(data.group.users || []);
      const memberIds = (data.group.users || []).map((u: User) => u.id);
      const students = availableUsers.filter(u => u.role === 'student' && !memberIds.includes(u.id));
      setAvailableStudentsForGroup(students);
      // Update groups list
      const grps = await messagesApi.getGroups();
      setGroups(grps);
    } catch (err) {
      console.error('Error removing member:', err);
    } finally {
      setIsRemovingMember(null);
    }
  };

  const toggleNewMember = (userId: number) => {
    setSelectedNewMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleMember = (userId: number) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllStudents = () => {
    setSelectedMembers(classStudents.map(s => s.id));
  };

  const deselectAllStudents = () => {
    setSelectedMembers([]);
  };

  const goBack = () => {
    setView('list');
    setSelectedUser(null);
    setSelectedGroup(null);
    setMessages([]);
  };

  const getUserName = (u: User) => {
    if (u.teacher_profile) {
      return `${u.teacher_profile.first_name} ${u.teacher_profile.last_name}`;
    }
    if (u.student_profile) {
      return `${u.student_profile.first_name} ${u.student_profile.last_name}`;
    }
    return u.email;
  };

  const getDisplayName = (u: User) => {
    let firstName = '';
    let lastName = '';

    if (u.teacher_profile) {
      firstName = u.teacher_profile.first_name || '';
      lastName = u.teacher_profile.last_name || '';
    } else if (u.student_profile) {
      firstName = u.student_profile.first_name || '';
      lastName = u.student_profile.last_name || '';
    }

    if (firstName && lastName) {
      return `${firstName} ${lastName[0]}.`;
    }
    if (firstName) {
      return firstName;
    }
    return u.email.split('@')[0];
  };

  const getUserInitials = (u: User) => {
    if (u.teacher_profile) {
      return `${u.teacher_profile.first_name?.[0] || ''}${u.teacher_profile.last_name?.[0] || ''}`;
    }
    if (u.student_profile) {
      return `${u.student_profile.first_name?.[0] || ''}${u.student_profile.last_name?.[0] || ''}`;
    }
    return u.email[0].toUpperCase();
  };

  const getStudentInitials = (s: ClassStudent) => {
    return `${s.first_name?.[0] || ''}${s.last_name?.[0] || ''}`;
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const dayDiff = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (dayDiff === 0) {
      return format(date, 'HH:mm', { locale: fr });
    } else if (dayDiff === 1) {
      return 'Hier';
    } else if (dayDiff < 7) {
      return format(date, 'EEEE', { locale: fr });
    } else {
      return format(date, 'dd/MM/yyyy', { locale: fr });
    }
  };

  const filteredUsers = availableUsers.filter(u =>
    getUserName(u).toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAvailableStudents = availableStudentsForGroup.filter(u =>
    getUserName(u).toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  // List view
  if (view === 'list') {
    return (
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-playfair font-semibold text-secondary">Messagerie</h1>
            <p className="text-gray-600 mt-2">
              Gerez vos conversations et groupes de discussion
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-primary text-white text-xs rounded-full">
                  {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={startNewConversation}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouveau message
            </button>
            <button
              onClick={startCreateGroup}
              className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
              Creer un groupe
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('direct')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'direct'
                ? 'bg-white shadow-sm text-secondary'
                : 'text-gray-500 hover:text-secondary'
            }`}
          >
            Messages directs ({conversations.length})
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'groups'
                ? 'bg-white shadow-sm text-secondary'
                : 'text-gray-500 hover:text-secondary'
            }`}
          >
            Groupes ({groups.length})
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {activeTab === 'direct' ? (
            conversations.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="text-lg font-medium text-secondary mb-2">Aucune conversation</h3>
                <p className="text-gray-500 mb-4">Commencez par envoyer un message</p>
                <button
                  onClick={startNewConversation}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Demarrer une conversation
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {conversations.map((conv) => {
                  const profile = conv.user.student_profile || conv.user.teacher_profile;
                  const gender = conv.user.student_profile?.gender || conv.user.teacher_profile?.gender;
                  const profilePhoto = conv.user.student_profile?.profile_photo || conv.user.teacher_profile?.profile_photo;
                  return (
                  <button
                    key={conv.user.id}
                    onClick={() => openChat(conv.user)}
                    className="w-full p-4 text-left hover:bg-gray-50 transition-colors flex items-center gap-4"
                  >
                    <div className="relative">
                      <UserAvatar
                        firstName={profile?.first_name || ''}
                        lastName={profile?.last_name || ''}
                        gender={gender}
                        profilePhoto={profilePhoto}
                        role={conv.user.role}
                        size="lg"
                        showGenderBadge={conv.user.role === 'student'}
                      />
                      {conv.unread_count > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`font-medium truncate ${conv.unread_count > 0 ? 'text-secondary' : 'text-gray-700'}`}>
                          {getUserName(conv.user)}
                        </p>
                        {conv.last_message && (
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                            {formatMessageTime(conv.last_message.sent_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          conv.user.role === 'teacher' || conv.user.role === 'admin'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {conv.user.role === 'admin' ? 'Admin' : conv.user.role === 'teacher' ? 'Enseignant' : 'Etudiant'}
                        </span>
                        {conv.last_message && (
                          <p className={`text-sm truncate ${conv.unread_count > 0 ? 'text-secondary font-medium' : 'text-gray-500'}`}>
                            {conv.last_message.sender_id === user?.id ? 'Vous: ' : ''}
                            {conv.last_message.content}
                          </p>
                        )}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  );
                })}
              </div>
            )
          ) : (
            groups.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
                <h3 className="text-lg font-medium text-secondary mb-2">Aucun groupe</h3>
                <p className="text-gray-500 mb-4">Creez un groupe de discussion</p>
                <button
                  onClick={startCreateGroup}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Creer un groupe
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-4"
                  >
                    <button
                      onClick={() => openGroupChat(group)}
                      className="flex-1 flex items-center gap-4 text-left"
                    >
                      <div className="relative">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                          </svg>
                        </div>
                        {group.unread_count && group.unread_count > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                            {group.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-secondary truncate">{group.name}</p>
                          {group.last_message && (
                            <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                              {formatMessageTime(group.last_message.sent_at)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            {group.members_count} membre{(group.members_count || 0) > 1 ? 's' : ''}
                          </span>
                          {group.students_can_write ? (
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                              Etudiants peuvent ecrire
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                              Lecture seule
                            </span>
                          )}
                          {group.last_message && (
                            <p className="text-sm text-gray-500 truncate">
                              {group.last_message.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => openGroupSettings(group)}
                      className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                      title="Parametres du groupe"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteGroup(group.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer le groupe"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  // New conversation view
  if (view === 'new') {
    return (
      <div className="p-8">
        <div className="mb-8">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-gray-600 hover:text-secondary transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </button>
          <h1 className="text-2xl font-playfair font-semibold text-secondary">Nouveau message</h1>
          <p className="text-gray-600 mt-2">Selectionnez un destinataire</p>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un utilisateur..."
            className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-500">Aucun utilisateur trouve</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
              {filteredUsers.map((u) => {
                const profile = u.student_profile || u.teacher_profile;
                const gender = u.student_profile?.gender || u.teacher_profile?.gender;
                const profilePhoto = u.student_profile?.profile_photo || u.teacher_profile?.profile_photo;
                return (
                <button
                  key={u.id}
                  onClick={() => selectNewUser(u)}
                  className="w-full p-4 text-left hover:bg-gray-50 transition-colors flex items-center gap-4"
                >
                  <UserAvatar
                    firstName={profile?.first_name || ''}
                    lastName={profile?.last_name || ''}
                    gender={gender}
                    profilePhoto={profilePhoto}
                    role={u.role}
                    size="lg"
                    showGenderBadge={u.role === 'student'}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-secondary truncate">
                      {getUserName(u)}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        u.role === 'admin'
                          ? 'bg-green-100 text-green-700'
                          : u.role === 'teacher'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {u.role === 'admin' ? 'Admin' : u.role === 'teacher' ? 'Enseignant' : 'Etudiant'}
                      </span>
                      <span className="text-sm text-gray-500 truncate">{u.email}</span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Create group view - multi-step wizard
  if (view === 'create-group') {
    const selectedClass = allClasses.find(c => c.id === selectedClassId);

    return (
      <div className="p-8">
        <div className="mb-8">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-gray-600 hover:text-secondary transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </button>
          <h1 className="text-2xl font-playfair font-semibold text-secondary">Creer un groupe</h1>
          <p className="text-gray-600 mt-2">Etape {createGroupStep} sur 6</p>
        </div>

        {/* Progress bar */}
        <div className="mb-8 max-w-2xl">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <div
                key={step}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  step < createGroupStep
                    ? 'bg-green-500 text-white'
                    : step === createGroupStep
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step < createGroupStep ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </div>
            ))}
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className="h-2 bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((createGroupStep - 1) / 5) * 100}%` }}
            />
          </div>
        </div>

        <div className="max-w-2xl">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            {/* Step 1: Group name */}
            {createGroupStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-secondary mb-2">Nom du groupe</h2>
                  <p className="text-gray-500 text-sm mb-4">Choisissez un nom pour votre groupe de discussion</p>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Ex: Classe Arabe Niveau 1 - 2024/2025"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-lg"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={nextStep}
                    disabled={!newGroupName.trim()}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Suivant
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Select class */}
            {createGroupStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-secondary mb-2">Choisir la classe</h2>
                  <p className="text-gray-500 text-sm mb-4">Selectionnez la classe concernee par ce groupe</p>

                  {isLoadingClasses ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    </div>
                  ) : allClasses.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <p className="text-gray-500">Aucune classe disponible</p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg max-h-80 overflow-y-auto">
                      {allClasses.map((cls) => (
                        <button
                          key={cls.id}
                          onClick={() => setSelectedClassId(cls.id)}
                          className={`w-full p-4 text-left border-b border-gray-100 last:border-b-0 transition-colors ${
                            selectedClassId === cls.id
                              ? 'bg-primary/5 border-l-4 border-l-primary'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-secondary">{cls.name}</p>
                              <p className="text-sm text-gray-500">{cls.program?.name}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {cls.academic_year} - {(cls as any).enrolled_students || 0} eleve{((cls as any).enrolled_students || 0) > 1 ? 's' : ''}
                              </p>
                            </div>
                            {selectedClassId === cls.id && (
                              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-between">
                  <button
                    onClick={prevStep}
                    className="px-6 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Precedent
                  </button>
                  <button
                    onClick={nextStep}
                    disabled={!selectedClassId || isLoadingStudents}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isLoadingStudents ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Chargement...
                      </>
                    ) : (
                      <>
                        Suivant
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: View students */}
            {createGroupStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-secondary mb-2">Eleves de la classe</h2>
                  <p className="text-gray-500 text-sm mb-4">
                    {selectedClass?.name} - {classStudents.length} eleve{classStudents.length > 1 ? 's' : ''} inscrit{classStudents.length > 1 ? 's' : ''}
                  </p>

                  {classStudents.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-gray-500">Aucun eleve inscrit dans cette classe</p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                      {classStudents.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center gap-3 p-3 border-b border-gray-100 last:border-b-0"
                        >
                          <UserAvatar
                            firstName={student.first_name}
                            lastName={student.last_name}
                            gender={student.student_profile?.gender}
                            size="sm"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-secondary">{student.first_name} {student.last_name}</p>
                            <p className="text-xs text-gray-500">{student.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-between">
                  <button
                    onClick={prevStep}
                    className="px-6 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Precedent
                  </button>
                  <button
                    onClick={nextStep}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                  >
                    Suivant
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Select members */}
            {createGroupStep === 4 && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="text-lg font-semibold text-secondary">Selectionner les membres</h2>
                      <p className="text-gray-500 text-sm">Choisissez les eleves a integrer dans le groupe</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAllStudents}
                        className="px-3 py-1 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors"
                      >
                        Tout selectionner
                      </button>
                      <button
                        onClick={deselectAllStudents}
                        className="px-3 py-1 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Tout deselectionner
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-primary font-medium mb-4">
                    {selectedMembers.length} eleve{selectedMembers.length > 1 ? 's' : ''} selectionne{selectedMembers.length > 1 ? 's' : ''}
                  </p>

                  <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                    {classStudents.map((student) => (
                      <label
                        key={student.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(student.id)}
                          onChange={() => toggleMember(student.id)}
                          className="w-5 h-5 text-primary focus:ring-primary rounded"
                        />
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-primary text-sm font-medium">
                            {getStudentInitials(student)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-secondary">{student.first_name} {student.last_name}</p>
                          <p className="text-xs text-gray-500">{student.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <button
                    onClick={prevStep}
                    className="px-6 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Precedent
                  </button>
                  <button
                    onClick={nextStep}
                    disabled={selectedMembers.length === 0}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Suivant
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Permissions */}
            {createGroupStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-secondary mb-2">Permissions d&apos;ecriture</h2>
                  <p className="text-gray-500 text-sm mb-6">Definissez les autorisations des eleves dans ce groupe</p>

                  <div className="space-y-4">
                    <label
                      className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                        !studentsCanWrite ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="permissions"
                        checked={!studentsCanWrite}
                        onChange={() => setStudentsCanWrite(false)}
                        className="mt-1 text-primary focus:ring-primary"
                      />
                      <div>
                        <p className="font-medium text-secondary">Lecture seule</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Les eleves peuvent uniquement lire les messages. Seuls les enseignants et administrateurs peuvent ecrire.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                        studentsCanWrite ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="permissions"
                        checked={studentsCanWrite}
                        onChange={() => setStudentsCanWrite(true)}
                        className="mt-1 text-primary focus:ring-primary"
                      />
                      <div>
                        <p className="font-medium text-secondary">Etudiants peuvent ecrire</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Les eleves peuvent lire et envoyer des messages dans le groupe.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
                <div className="flex justify-between">
                  <button
                    onClick={prevStep}
                    className="px-6 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Precedent
                  </button>
                  <button
                    onClick={nextStep}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                  >
                    Suivant
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Step 6: Summary and create */}
            {createGroupStep === 6 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-secondary mb-2">Recapitulatif</h2>
                  <p className="text-gray-500 text-sm mb-6">Verifiez les informations avant de creer le groupe</p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-500">Nom du groupe</p>
                        <p className="font-medium text-secondary">{newGroupName}</p>
                      </div>
                      <button
                        onClick={() => goToStep(1)}
                        className="text-primary text-sm hover:underline"
                      >
                        Modifier
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-500">Classe</p>
                        <p className="font-medium text-secondary">{selectedClass?.name}</p>
                        <p className="text-xs text-gray-400">{selectedClass?.program?.name}</p>
                      </div>
                      <button
                        onClick={() => goToStep(2)}
                        className="text-primary text-sm hover:underline"
                      >
                        Modifier
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-500">Membres</p>
                        <p className="font-medium text-secondary">
                          {selectedMembers.length} eleve{selectedMembers.length > 1 ? 's' : ''} selectionne{selectedMembers.length > 1 ? 's' : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => goToStep(4)}
                        className="text-primary text-sm hover:underline"
                      >
                        Modifier
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-500">Permissions</p>
                        <p className="font-medium text-secondary">
                          {studentsCanWrite ? 'Etudiants peuvent ecrire' : 'Lecture seule'}
                        </p>
                      </div>
                      <button
                        onClick={() => goToStep(5)}
                        className="text-primary text-sm hover:underline"
                      >
                        Modifier
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <button
                    onClick={prevStep}
                    className="px-6 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Precedent
                  </button>
                  <button
                    onClick={createGroup}
                    disabled={isCreatingGroup}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isCreatingGroup ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Creation...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Creer le groupe
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Group settings view
  if (view === 'group-settings' && selectedGroup) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-gray-600 hover:text-secondary transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </button>
          <h1 className="text-2xl font-playfair font-semibold text-secondary">Parametres du groupe</h1>
          <p className="text-gray-600 mt-2">Modifiez les parametres de &quot;{selectedGroup.name}&quot;</p>
        </div>

        <form onSubmit={saveGroupSettings} className="max-w-2xl">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom du groupe</label>
              <input
                type="text"
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
                placeholder="Ex: Classe Arabe Niveau 1"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
            </div>

            <div className="border-t border-gray-200 pt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editStudentsCanWrite}
                  onChange={(e) => setEditStudentsCanWrite(e.target.checked)}
                  className="w-5 h-5 text-primary focus:ring-primary rounded"
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">Autoriser les etudiants a ecrire</p>
                  <p className="text-xs text-gray-500">
                    Si desactive, seuls les enseignants et administrateurs pourront envoyer des messages dans ce groupe.
                  </p>
                </div>
              </label>
            </div>

            {/* Members management section */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-700">
                  Membres du groupe ({groupMembers.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddMembers(!showAddMembers)}
                  className="px-3 py-1.5 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Ajouter des membres
                </button>
              </div>

              {/* Add members interface */}
              {showAddMembers && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700">Ajouter des eleves</p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMembers(false);
                        setSelectedNewMembers([]);
                        setMemberSearchQuery('');
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Search input */}
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="Rechercher un eleve..."
                    className="w-full px-3 py-2 mb-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                  />

                  {/* Available students list */}
                  {filteredAvailableStudents.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      {availableStudentsForGroup.length === 0
                        ? 'Tous les eleves sont deja membres du groupe'
                        : 'Aucun eleve trouve'}
                    </p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                      {filteredAvailableStudents.map((student) => (
                        <label
                          key={student.id}
                          className="flex items-center gap-3 p-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={selectedNewMembers.includes(student.id)}
                            onChange={() => toggleNewMember(student.id)}
                            className="w-4 h-4 text-primary focus:ring-primary rounded"
                          />
                          <UserAvatar
                            firstName={student.student_profile?.first_name || ''}
                            lastName={student.student_profile?.last_name || ''}
                            gender={student.student_profile?.gender}
                            profilePhoto={student.student_profile?.profile_photo}
                            role="student"
                            size="sm"
                            showGenderBadge={true}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-secondary truncate">{getUserName(student)}</p>
                            <p className="text-xs text-gray-500 truncate">{student.email}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Add button */}
                  {selectedNewMembers.length > 0 && (
                    <button
                      type="button"
                      onClick={addMembersToGroup}
                      disabled={isAddingMembers}
                      className="mt-3 w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isAddingMembers ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Ajout en cours...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Ajouter {selectedNewMembers.length} membre{selectedNewMembers.length > 1 ? 's' : ''}
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Current members list */}
              {isLoadingGroupMembers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                </div>
              ) : groupMembers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Aucun membre dans ce groupe</p>
              ) : (
                <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                  {groupMembers.map((member) => {
                    const isCreator = member.id === selectedGroup.created_by;
                    const isCurrentUser = member.id === user?.id;
                    const memberProfile = member.student_profile || member.teacher_profile;
                    const memberGender = member.student_profile?.gender || member.teacher_profile?.gender;
                    const memberPhoto = member.student_profile?.profile_photo || member.teacher_profile?.profile_photo;
                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 border-b border-gray-100 last:border-b-0"
                      >
                        <UserAvatar
                          firstName={memberProfile?.first_name || ''}
                          lastName={memberProfile?.last_name || ''}
                          gender={memberGender}
                          profilePhoto={memberPhoto}
                          role={member.role}
                          size="md"
                          showGenderBadge={member.role === 'student'}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-secondary truncate">{getUserName(member)}</p>
                            {isCreator && (
                              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full flex-shrink-0">
                                Createur
                              </span>
                            )}
                            {isCurrentUser && !isCreator && (
                              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full flex-shrink-0">
                                Vous
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              member.role === 'admin' ? 'bg-green-100 text-green-700' :
                              member.role === 'teacher' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {member.role === 'admin' ? 'Admin' : member.role === 'teacher' ? 'Enseignant' : 'Eleve'}
                            </span>
                            <p className="text-xs text-gray-500 truncate">{member.email}</p>
                          </div>
                        </div>
                        {!isCreator && !isCurrentUser && (
                          <button
                            type="button"
                            onClick={() => removeMemberFromGroup(member.id)}
                            disabled={isRemovingMember === member.id}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Retirer du groupe"
                          >
                            {isRemovingMember === member.id ? (
                              <div className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin"></div>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Informations</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p><span className="font-medium">Type:</span> {selectedGroup.type === 'custom' ? 'Personnalise' : selectedGroup.type === 'program' ? 'Programme' : 'Classe'}</p>
                <p><span className="font-medium">Membres:</span> {groupMembers.length} membre{groupMembers.length > 1 ? 's' : ''}</p>
                <p><span className="font-medium">Cree le:</span> {format(new Date(selectedGroup.created_at), 'dd MMMM yyyy', { locale: fr })}</p>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={goBack}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSavingGroup || !editGroupName.trim()}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSavingGroup ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer'
                )}
              </button>
              <button
                type="button"
                onClick={() => deleteGroup(selectedGroup.id)}
                className="ml-auto px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Supprimer le groupe
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // Chat view (direct messages or group)
  const isGroupChat = view === 'group-chat';
  const chatTitle = isGroupChat ? selectedGroup?.name : selectedUser ? getUserName(selectedUser) : '';
  const chatSubtitle = isGroupChat
    ? `${selectedGroup?.members_count} membre${(selectedGroup?.members_count || 0) > 1 ? 's' : ''}${selectedGroup?.students_can_write ? '' : ' - Lecture seule'}`
    : selectedUser?.role === 'admin' ? 'Administrateur' : selectedUser?.role === 'teacher' ? 'Enseignant' : 'Etudiant';

  return (
    <div className="p-8 h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-200">
        <button
          onClick={goBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {isGroupChat ? (
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
          </div>
        ) : selectedUser && (
          <UserAvatar
            firstName={selectedUser.student_profile?.first_name || selectedUser.teacher_profile?.first_name || ''}
            lastName={selectedUser.student_profile?.last_name || selectedUser.teacher_profile?.last_name || ''}
            gender={selectedUser.student_profile?.gender || selectedUser.teacher_profile?.gender}
            profilePhoto={selectedUser.student_profile?.profile_photo || selectedUser.teacher_profile?.profile_photo}
            role={selectedUser.role}
            size="md"
            showGenderBadge={selectedUser.role === 'student'}
          />
        )}
        <div className="flex-1">
          <h2 className="font-medium text-secondary">{chatTitle}</h2>
          <p className="text-sm text-gray-500">{chatSubtitle}</p>
        </div>
        {isGroupChat && (
          <>
            <button
              onClick={() => selectedGroup && openGroupSettings(selectedGroup)}
              className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
              title="Parametres du groupe"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={() => selectedGroup && deleteGroup(selectedGroup.id)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Supprimer le groupe"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-gray-500">Aucun message</p>
              <p className="text-sm text-gray-400 mt-1">Envoyez le premier message!</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const isOwn = msg.sender_id === user?.id;
              const showDate = index === 0 ||
                new Date(messages[index - 1].sent_at).toDateString() !== new Date(msg.sent_at).toDateString();

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="text-center my-4">
                      <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                        {format(new Date(msg.sent_at), 'EEEE d MMMM yyyy', { locale: fr })}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    {isGroupChat && !isOwn && msg.sender && (
                      <div className="mr-2 flex-shrink-0">
                        <UserAvatar
                          firstName={msg.sender.student_profile?.first_name || msg.sender.teacher_profile?.first_name || ''}
                          lastName={msg.sender.student_profile?.last_name || msg.sender.teacher_profile?.last_name || ''}
                          gender={msg.sender.student_profile?.gender || msg.sender.teacher_profile?.gender}
                          profilePhoto={msg.sender.student_profile?.profile_photo || msg.sender.teacher_profile?.profile_photo}
                          role={msg.sender.role}
                          size="sm"
                          showGenderBadge={false}
                        />
                      </div>
                    )}
                    <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                      {isGroupChat && !isOwn && msg.sender && (
                        <p className="text-xs text-gray-500 mb-1 ml-1">
                          {getDisplayName(msg.sender)}
                        </p>
                      )}
                      <div className={`px-4 py-2 rounded-2xl ${
                        isOwn
                          ? 'bg-primary text-white rounded-br-md'
                          : 'bg-gray-100 text-secondary rounded-bl-md'
                      }`}>
                        {msg.content && (
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        )}
                        {msg.attachment_url && msg.attachment_type === 'image' && (
                          <img
                            src={msg.attachment_url}
                            alt={msg.attachment_original_name ?? 'image'}
                            className="mt-1 rounded-lg max-w-full max-h-48 object-contain cursor-pointer"
                            onClick={() => window.open(msg.attachment_url!, '_blank')}
                          />
                        )}
                        {msg.attachment_url && msg.attachment_type === 'pdf' && (
                          <a
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`mt-1 flex items-center gap-2 text-xs underline ${isOwn ? 'text-white/80' : 'text-primary'}`}
                          >
                            <FileText size={14} />
                            <span className="truncate max-w-[180px]">{msg.attachment_original_name ?? 'document.pdf'}</span>
                            <Download size={12} className="flex-shrink-0" />
                          </a>
                        )}
                        {msg.attachment_url && msg.attachment_type === 'audio' && (
                          <div className="mt-1">
                            <audio controls className="max-w-full h-8">
                              <source src={msg.attachment_url} />
                            </audio>
                          </div>
                        )}
                      </div>
                      <p className={`text-xs text-gray-400 mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                        {format(new Date(msg.sent_at), 'HH:mm', { locale: fr })}
                        {isOwn && msg.read_at && (
                          <span className="ml-1">✓</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message input */}
      <div>
        {selectedFile && (
          <div className="mb-2 flex items-center gap-2">
            <div className="flex items-center gap-2 bg-primary/10 text-primary text-xs px-3 py-1.5 rounded-lg max-w-xs">
              {selectedFile.type.startsWith('image/') ? (
                <Paperclip size={14} />
              ) : selectedFile.type === 'application/pdf' ? (
                <FileText size={14} />
              ) : (
                <Music size={14} />
              )}
              <span className="truncate">{selectedFile.name}</span>
              <span className="text-primary/60 flex-shrink-0">({formatFileSize(selectedFile.size)})</span>
            </div>
            <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
        )}
        <form onSubmit={sendMessage} className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,audio/mpeg,audio/ogg,audio/wav"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors flex items-center justify-center"
            title="Joindre un fichier"
          >
            <Paperclip size={20} />
          </button>
          <input
            type="text"
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            placeholder="Ecrivez votre message..."
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={isSending || (!messageContent.trim() && !selectedFile)}
            className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Send size={20} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
