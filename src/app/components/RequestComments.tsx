import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, MessageCircle, User, Shield } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Comment {
  id: string;
  request_id: string;
  user_id: string | number;
  user_name: string;
  user_role: 'employee' | 'admin' | 'manager';
  text: string;
  timestamp: string;
}

interface RequestCommentsProps {
  requestId: string;
  currentUserId: string | number;
  currentUserName: string;
  currentUserRole: 'employee' | 'admin' | 'manager';
  onCommentAdded?: () => void;
}

export function RequestComments({
  requestId,
  currentUserId,
  currentUserName,
  currentUserRole,
  onCommentAdded
}: RequestCommentsProps) {
  const { t, language } = useLanguage();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchComments();
  }, [requestId]);

  useEffect(() => {
    // Scroll to bottom when new comments are added
    scrollToBottom();
  }, [comments]);

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/requests/${requestId}/comments`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      const data = await response.json();
      
      if (data.success) {
        setComments(data.comments || []);
      } else {
        console.error('Failed to fetch comments:', data.message);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error(t('Please enter a comment', 'يرجى إدخال تعليق'));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/requests/${requestId}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            user_id: currentUserId,
            user_name: currentUserName,
            user_role: currentUserRole,
            text: newComment.trim()
          })
        }
      );
      const data = await response.json();

      if (data.success) {
        setNewComment('');
        await fetchComments();
        toast.success(t('Comment added successfully', 'تم إضافة التعليق بنجاح'));
        onCommentAdded?.();
      } else {
        toast.error(t('Failed to add comment', 'فشل إضافة التعليق'));
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error(t('Failed to add comment', 'فشل إضافة التعليق'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm(t('Are you sure you want to delete this comment?', 'هل أنت متأكد من حذف هذا التعليق؟'))) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/comments/${commentId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      const data = await response.json();

      if (data.success) {
        await fetchComments();
        toast.success(t('Comment deleted successfully', 'تم حذف التعليق بنجاح'));
      } else {
        toast.error(t('Failed to delete comment', 'فشل حذف التعليق'));
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error(t('Failed to delete comment', 'فشل حذف التعليق'));
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('Just now', 'الآن');
    if (diffMins < 60) return t(`${diffMins} min ago`, `منذ ${diffMins} دقيقة`);
    if (diffHours < 24) return t(`${diffHours}h ago`, `منذ ${diffHours} ساعة`);
    if (diffDays < 7) return t(`${diffDays}d ago`, `منذ ${diffDays} يوم`);
    
    return language === 'ar' 
      ? date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
      : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h3 className="font-medium">
          {t('Discussion', 'المناقشة')}
        </h3>
        {comments.length > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {comments.length}
          </Badge>
        )}
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 max-h-[400px]">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('Loading comments...', 'جاري تحميل التعليقات...')}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>{t('No comments yet', 'لا توجد تعليقات بعد')}</p>
            <p className="text-sm mt-1">
              {t('Start a discussion about this request', 'ابدأ مناقشة حول هذا الطلب')}
            </p>
          </div>
        ) : (
          <>
            {comments.map((comment) => {
              const isCurrentUser = comment.user_id == currentUserId;
              const isAdmin = comment.user_role === 'admin';

              return (
                <div
                  key={comment.id}
                  className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <Avatar className={`h-8 w-8 flex-shrink-0 ${isAdmin ? 'bg-primary-dark' : 'bg-primary'}`}>
                    <AvatarFallback className="text-white text-xs">
                      {isAdmin ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>

                  {/* Comment Content */}
                  <div className={`flex-1 ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col max-w-[80%]`}>
                    {/* User Info */}
                    <div className={`flex items-center gap-2 mb-1 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                      <span className="text-sm font-medium">
                        {comment.user_name}
                      </span>
                      {isAdmin && (
                        <Badge variant="outline" className="text-xs bg-primary-dark/10 text-primary-dark border-primary-dark/20">
                          {t('Admin', 'مدير')}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(comment.timestamp)}
                      </span>
                    </div>

                    {/* Comment Text */}
                    <Card className={`p-3 ${
                      isCurrentUser 
                        ? 'bg-primary text-primary-foreground' 
                        : isAdmin
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-muted'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {comment.text}
                      </p>
                    </Card>

                    {/* Delete Button (Admin only) */}
                    {currentUserRole === 'admin' && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-xs text-muted-foreground hover:text-destructive mt-1 flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        {t('Delete', 'حذف')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={commentsEndRef} />
          </>
        )}
      </div>

      {/* Add Comment Form */}
      <div className="border-t border-border pt-4">
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t('Write a comment...', 'اكتب تعليقاً...')}
            className="flex-1 min-h-[80px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleAddComment();
              }
            }}
          />
          <Button
            onClick={handleAddComment}
            disabled={isSubmitting || !newComment.trim()}
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {t('Press Ctrl+Enter to send', 'اضغط Ctrl+Enter للإرسال')}
        </p>
      </div>
    </div>
  );
}