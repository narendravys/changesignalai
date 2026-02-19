"use client";

import { useState, useEffect } from "react";
import { api, formatApiError } from "@/lib/api";
import { FiMessageCircle, FiSend, FiTrash2, FiUser } from "react-icons/fi";
import { format } from "date-fns";
import { useToast } from "@/hooks/useToast";

interface CommentsProps {
  changeEventId: number;
}

export default function Comments({ changeEventId }: CommentsProps) {
  const toast = useToast();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    loadComments();
  }, [changeEventId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await api.getCommentsForChange(changeEventId);
      setComments(data);
    } catch (error: any) {
      toast.error(formatApiError(error, "Failed to load comments"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    try {
      setSubmitting(true);
      await api.createComment(changeEventId, newComment);
      setNewComment("");
      loadComments();
      toast.success("Comment added successfully!");
    } catch (error: any) {
      toast.error(formatApiError(error, "Failed to add comment"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      await api.deleteComment(commentId);
      loadComments();
      toast.success("Comment deleted successfully!");
    } catch (error: any) {
      toast.error(formatApiError(error, "Failed to delete comment"));
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 border-2 border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center">
          <FiMessageCircle className="w-5 h-5 mr-2 text-purple-600" />
          Team Discussion
          {comments.length > 0 && (
            <span className="ml-2 px-2 py-1 text-xs font-bold bg-purple-100 text-purple-700 rounded-full">
              {comments.length}
            </span>
          )}
        </h3>
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <FiUser className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add your thoughts, questions, or insights..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors resize-none"
              rows={3}
              disabled={submitting}
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Posting...</span>
                  </>
                ) : (
                  <>
                    <FiSend className="w-4 h-4" />
                    <span>Post Comment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Comments List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl">
          <FiMessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No comments yet</p>
          <p className="text-sm text-gray-400 mt-1">Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">
                  {comment.user_name?.charAt(0).toUpperCase() || comment.user_email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {comment.user_name || comment.user_email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(comment.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete comment"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-700 mt-2 leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
