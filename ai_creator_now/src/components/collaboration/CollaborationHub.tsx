import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, MessageSquare, Share2, Clock, Eye, Edit3, UserPlus, Settings, Bell, X, Send, Reply, Heart, Trash2, Star } from 'lucide-react';

interface User {
  id: string;
  name: string;
  avatar?: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  isOnline: boolean;
  lastSeen?: Date;
  cursor?: {
    x: number;
    y: number;
    element: string;
  };
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  elementId?: string;
  elementPosition?: { x: number; y: number };
  replies: Comment[];
  resolved: boolean;
  likes: number;
  isLiked: boolean;
}

interface Activity {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: Date;
  details?: any;
}

interface CollaborationHubProps {
  projectId?: string;
  currentUserId?: string;
  className?: string;
  onInviteUser?: (email: string, role: string) => void;
}

export const CollaborationHub: React.FC<CollaborationHubProps> = ({
  projectId,
  currentUserId,
  className = "",
  onInviteUser
}) => {
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [activeTab, setActiveTab] = useState<'users' | 'comments' | 'activity'>('users');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // 模拟实时协作数据
  useEffect(() => {
    const mockUsers: User[] = [
      {
        id: '1',
        name: '张三',
        email: 'zhangsan@example.com',
        role: 'owner',
        isOnline: true,
        cursor: { x: 100, y: 200, element: 'timeline' }
      },
      {
        id: '2',
        name: '李四',
        email: 'lisi@example.com',
        role: 'editor',
        isOnline: true,
        lastSeen: new Date(Date.now() - 5 * 60 * 1000),
        cursor: { x: 300, y: 150, element: 'scene-1' }
      },
      {
        id: '3',
        name: '王五',
        email: 'wangwu@example.com',
        role: 'viewer',
        isOnline: false,
        lastSeen: new Date(Date.now() - 30 * 60 * 1000)
      }
    ];

    const mockComments: Comment[] = [
      {
        id: '1',
        userId: '2',
        userName: '李四',
        content: '这个场景的转场效果很棒！建议可以在背景音乐上做一些调整。',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        elementId: 'scene-1',
        elementPosition: { x: 150, y: 100 },
        replies: [
          {
            id: '1-1',
            userId: '1',
            userName: '张三',
            content: '好建议！我会尝试添加一些轻快的背景音乐。',
            timestamp: new Date(Date.now() - 8 * 60 * 1000),
            replies: [],
            resolved: false,
            likes: 1,
            isLiked: false
          }
        ],
        resolved: false,
        likes: 3,
        isLiked: true
      },
      {
        id: '2',
        userId: '3',
        userName: '王五',
        content: '整体的色彩搭配很协调，有专业水准。',
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        replies: [],
        resolved: true,
        likes: 2,
        isLiked: false
      }
    ];

    const mockActivities: Activity[] = [
      {
        id: '1',
        userId: '2',
        userName: '李四',
        action: '编辑了场景1',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        details: { sceneId: 'scene-1', changes: ['调整了时长', '修改了文字'] }
      },
      {
        id: '2',
        userId: '1',
        userName: '张三',
        action: '添加了新场景',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        details: { sceneId: 'scene-3' }
      },
      {
        id: '3',
        userId: '3',
        userName: '王五',
        action: '查看了项目',
        timestamp: new Date(Date.now() - 30 * 60 * 1000)
      }
    ];

    setActiveUsers(mockUsers);
    setComments(mockComments);
    setActivities(mockActivities);

    // 模拟实时更新
    const interval = setInterval(() => {
      // 随机更新用户在线状态
      setActiveUsers(prev => prev.map(user => ({
        ...user,
        isOnline: Math.random() > 0.3
      })));
    }, 30000);

    return () => clearInterval(interval);
  }, [projectId]);

  // 滚动到评论底部
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // 发送新评论
  const handleSendComment = useCallback(() => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      userId: currentUserId || '1',
      userName: '当前用户',
      content: newComment,
      timestamp: new Date(),
      replies: [],
      resolved: false,
      likes: 0,
      isLiked: false
    };

    setComments(prev => [...prev, comment]);
    setNewComment('');
  }, [newComment, currentUserId]);

  // 回复评论
  const handleReply = useCallback((commentId: string) => {
    if (!replyContent.trim()) return;

    const reply: Comment = {
      id: `${commentId}-${Date.now()}`,
      userId: currentUserId || '1',
      userName: '当前用户',
      content: replyContent,
      timestamp: new Date(),
      replies: [],
      resolved: false,
      likes: 0,
      isLiked: false
    };

    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          replies: [...comment.replies, reply]
        };
      }
      return comment;
    }));

    setReplyContent('');
    setReplyingTo(null);
  }, [replyContent, currentUserId]);

  // 点赞评论
  const handleLikeComment = useCallback((commentId: string) => {
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
          isLiked: !comment.isLiked
        };
      }
      return comment;
    }));
  }, []);

  // 解决评论
  const handleResolveComment = useCallback((commentId: string) => {
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        return { ...comment, resolved: !comment.resolved };
      }
      return comment;
    }));
  }, []);

  // 删除评论
  const handleDeleteComment = useCallback((commentId: string) => {
    setComments(prev => prev.filter(comment => comment.id !== commentId));
  }, []);

  // 邀请用户
  const handleInviteUser = useCallback(() => {
    if (!inviteEmail.trim()) return;

    if (onInviteUser) {
      onInviteUser(inviteEmail, inviteRole);
    }

    // 模拟添加用户
    const newUser: User = {
      id: Date.now().toString(),
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      isOnline: false
    };

    setActiveUsers(prev => [...prev, newUser]);
    setInviteEmail('');
    setShowInviteModal(false);
  }, [inviteEmail, inviteRole, onInviteUser]);

  // 格式化时间
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* 头部 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">协作中心</h3>
              <p className="text-sm text-gray-600">实时协作与团队交流</p>
            </div>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>邀请成员</span>
          </button>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {activeUsers.filter(u => u.isOnline).length}
            </div>
            <div className="text-xs text-gray-500">在线成员</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {comments.filter(c => !c.resolved).length}
            </div>
            <div className="text-xs text-gray-500">待处理评论</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {activities.length}
            </div>
            <div className="text-xs text-gray-500">今日活动</div>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>团队成员</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'comments'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span>评论讨论</span>
              {comments.filter(c => !c.resolved).length > 0 && (
                <span className="bg-red-100 text-red-600 px-2 py-0.5 text-xs rounded-full">
                  {comments.filter(c => !c.resolved).length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'activity'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>活动记录</span>
            </div>
          </button>
        </nav>
      </div>

      {/* 内容区域 */}
      <div className="p-6">
        {/* 团队成员标签页 */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {activeUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-medium">
                      {user.name.charAt(0)}
                    </div>
                    {user.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">{user.name}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        user.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'editor' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {user.role === 'owner' ? '所有者' :
                         user.role === 'editor' ? '编辑者' : '查看者'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    user.isOnline ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {user.isOnline ? '在线' : user.lastSeen ? formatTime(user.lastSeen) : '离线'}
                  </div>
                  {user.cursor && (
                    <div className="text-xs text-gray-500">
                      正在查看: {user.cursor.element}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 评论讨论标签页 */}
        {activeTab === 'comments' && (
          <div className="space-y-4">
            {/* 新评论输入 */}
            <div className="flex space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                我
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="添加评论..."
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={handleSendComment}
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>发送</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 评论列表 */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {comments.map(comment => (
                <div key={comment.id} className={`border rounded-lg p-4 ${comment.resolved ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'}`}>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-green-400 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                      {comment.userName.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{comment.userName}</h4>
                          <span className="text-xs text-gray-500">{formatTime(comment.timestamp)}</span>
                          {comment.resolved && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                              已解决
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleLikeComment(comment.id)}
                            className={`flex items-center space-x-1 text-sm ${
                              comment.isLiked ? 'text-red-600' : 'text-gray-500 hover:text-red-600'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${comment.isLiked ? 'fill-current' : ''}`} />
                            <span>{comment.likes}</span>
                          </button>
                          <button
                            onClick={() => setReplyingTo(comment.id)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <Reply className="w-4 h-4" />
                          </button>
                          {currentUserId === comment.userId && (
                            <>
                              <button
                                onClick={() => handleResolveComment(comment.id)}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                <Star className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-gray-500 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-700 mb-3">{comment.content}</p>

                      {/* 回复输入框 */}
                      {replyingTo === comment.id && (
                        <div className="flex space-x-2 mb-3">
                          <input
                            type="text"
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="写下回复..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                          <button
                            onClick={() => handleReply(comment.id)}
                            disabled={!replyContent.trim()}
                            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg"
                          >
                            回复
                          </button>
                          <button
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyContent('');
                            }}
                            className="px-3 py-2 text-gray-500 hover:text-gray-700"
                          >
                            取消
                          </button>
                        </div>
                      )}

                      {/* 回复列表 */}
                      {comment.replies.length > 0 && (
                        <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                          {comment.replies.map(reply => (
                            <div key={reply.id} className="flex items-start space-x-2">
                              <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-blue-400 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                                {reply.userName.charAt(0)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h5 className="font-medium text-gray-900 text-sm">{reply.userName}</h5>
                                  <span className="text-xs text-gray-500">{formatTime(reply.timestamp)}</span>
                                </div>
                                <p className="text-gray-700 text-sm">{reply.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>
          </div>
        )}

        {/* 活动记录标签页 */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            {activities.map(activity => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-400 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                  {activity.userName.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-900">{activity.userName}</h4>
                    <span className="text-xs text-gray-500">{formatTime(activity.timestamp)}</span>
                  </div>
                  <p className="text-gray-700">{activity.action}</p>
                  {activity.details && (
                    <div className="mt-1 text-sm text-gray-500">
                      {Object.entries(activity.details).map(([key, value]) => (
                        <span key={key} className="mr-3">
                          {key}: {Array.isArray(value) ? value.join(', ') : String(value)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 邀请用户模态框 */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">邀请团队成员</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  邮箱地址
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="请输入邮箱地址"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  角色
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="editor">编辑者</option>
                  <option value="viewer">查看者</option>
                </select>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleInviteUser}
                  disabled={!inviteEmail.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
                >
                  发送邀请
                </button>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborationHub;