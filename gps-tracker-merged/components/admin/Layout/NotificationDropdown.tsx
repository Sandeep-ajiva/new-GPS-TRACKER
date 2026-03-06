"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, AlertTriangle, ShieldX, Activity, MapPin, AlertCircle, X, Eye, Trash2 } from "lucide-react";
import { useGetNotificationsQuery, useMarkAsReadMutation, useDeleteNotificationMutation } from "@/redux/api/notificationsApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NotificationDetailsModalProps {
  notification: any;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}

function NotificationDetailsModal({ notification, isOpen, onClose, onDelete }: NotificationDetailsModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    onDelete(notification._id);
    setShowDeleteConfirm(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-[9999999] flex items-start justify-center p-4 pt-20">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Notification Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Alert Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Alert Type</label>
              <div className="mt-1 text-sm font-medium text-gray-900">
                {notification.alertName || notification.title || notification.type || 'System Alert'}
              </div>
            </div>
            
            {/* Vehicle */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicle</label>
              <div className="mt-1 text-sm font-medium text-gray-900">
                {notification.vehicleNumber || notification.imei || 'Unknown Vehicle'}
              </div>
            </div>

            {/* Speed */}
            {notification.speed && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Speed</label>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {notification.speed} km/h
                </div>
              </div>
            )}

            {/* Driver */}
            {notification.driverName && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Driver</label>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {notification.driverName}
                </div>
              </div>
            )}

            {/* Location */}
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</label>
              <div className="mt-1 text-sm font-medium text-gray-900">
                {notification.address || 'Location unavailable'}
              </div>
            </div>

            {/* Coordinates */}
            {notification.lat && notification.lng && (
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Coordinates</label>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {notification.lat}, {notification.lng}
                </div>
              </div>
            )}

            {/* Time */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</label>
              <div className="mt-1 text-sm font-medium text-gray-900">
                {new Date(notification.createdAt || notification.timestamp || notification.gpsTimestamp).toLocaleString()}
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Severity</label>
              <div className="mt-1">
                <Badge variant="default" className={`text-xs ${
                  (notification.severity || notification.priority)?.toLowerCase().includes('critical') ? 'bg-red-600 text-white' :
                  (notification.severity || notification.priority)?.toLowerCase().includes('warning') ? 'bg-amber-500 text-white' :
                  'bg-blue-600 text-white'
                }`}>
                  {notification.severity || notification.priority || 'Normal'}
                </Badge>
              </div>
            </div>

            {/* Message */}
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Message</label>
              <div className="mt-1 text-sm font-medium text-gray-900">
                {notification.message || notification.description || 'No message available'}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          {showDeleteConfirm ? (
            <>
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                variant="default"
                size="sm"
                className="bg-red-700 hover:bg-red-800 text-white font-semibold"
              >
                Delete Notification
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="outline"
                size="sm"
                className="border-red-600 text-red-700 hover:bg-red-50 hover:border-red-700 font-semibold"
              >
                <Trash2 size={14} className="mr-2" />
                Delete Notification
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
              >
                Close
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Alert type icons
const getAlertIcon = (type: string, severity: string) => {
  const iconClass = "w-4 h-4";
  
  if (type?.toLowerCase().includes("overspeed") || type?.toLowerCase().includes("speed")) {
    return <AlertTriangle className={`${iconClass} text-amber-500`} />;
  }
  if (type?.toLowerCase().includes("ignition")) {
    return severity?.toLowerCase().includes("on") ? 
      <Activity className={`${iconClass} text-green-500`} /> : 
      <ShieldX className={`${iconClass} text-gray-500}`} />;
  }
  if (type?.toLowerCase().includes("offline") || type?.toLowerCase().includes("lost")) {
    return <AlertCircle className={`${iconClass} text-red-500`} />;
  }
  if (type?.toLowerCase().includes("sos") || type?.toLowerCase().includes("emergency")) {
    return <AlertTriangle className={`${iconClass} text-red-600`} />;
  }
  if (type?.toLowerCase().includes("geofence") || type?.toLowerCase().includes("location")) {
    return <MapPin className={`${iconClass} text-blue-500`} />;
  }
  
  return <AlertCircle className={`${iconClass} text-gray-500}`} />;
};

// Severity badge styles
const getSeverityBadge = (severity: string) => {
  const severityLower = severity?.toLowerCase();
  
  if (severityLower?.includes("critical") || severityLower?.includes("emergency")) {
    return <Badge variant="default" className="text-xs font-semibold bg-red-600 text-white">CRITICAL</Badge>;
  }
  if (severityLower?.includes("warning") || severityLower?.includes("medium")) {
    return <Badge variant="default" className="text-xs font-semibold bg-amber-500 text-white">WARNING</Badge>;
  }
  if (severityLower?.includes("info") || severityLower?.includes("low")) {
    return <Badge variant="default" className="text-xs font-semibold bg-blue-600 text-white">INFO</Badge>;
  }
  
  return <Badge variant="secondary" className="text-xs font-semibold">NORMAL</Badge>;
};

// Format time to relative
const formatRelativeTime = (timestamp: string) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const { data: notificationsData, isLoading } = useGetNotificationsQuery(undefined, {
    pollingInterval: 30000, // Poll every 30 seconds
  });
  const [markAsRead] = useMarkAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const notifications = notificationsData?.data || [];
  const unreadCount = notifications.filter((n: any) => !n.acknowledged).length;
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const handleNotificationClick = async (notification: any) => {
    console.log('Notification clicked:', notification._id, 'acknowledged:', notification.acknowledged);
    
    // Mark as read if unread - do NOT open modal
    if (!notification.acknowledged) {
      try {
        await markAsRead(notification._id).unwrap();
        console.log('Marked as read successfully');
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }
    // Do not open modal on row click
  };

  const handleViewDetails = (notification: any) => {
    console.log('View details clicked:', notification._id);
    // Close dropdown first
    onClose();
    // Open modal for details
    setSelectedNotification(notification);
    setIsModalOpen(true);
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId).unwrap();
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const handleDeleteFromDropdown = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    
    if (confirm("Delete this notification?")) {
      try {
        await deleteNotification(notificationId).unwrap();
      } catch (error) {
        console.error("Failed to delete notification:", error);
      }
    }
  };

  // Show only latest 10 notifications
  const recentNotifications = notifications.slice(0, 10);

  return (
    <>
      <div className="relative">
        <div
          ref={dropdownRef}
          className={`absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-[99999] overflow-hidden transition-all ${
            isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="default" className="text-xs bg-red-600 text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              // Skeleton loading
              [...Array(5)].map((_, i) => (
                <div key={i} className="px-4 py-3 border-b border-gray-100 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : recentNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No notifications found</p>
              </div>
            ) : (
              recentNotifications.map((notif: any) => (
                <div
                  key={notif._id}
                  className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notif.acknowledged ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="flex items-start gap-3">
                    {/* Unread indicator */}
                    {!notif.acknowledged && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    )}

                    {/* Alert Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getAlertIcon(notif.alertName || notif.type || 'Alert', notif.severity || notif.priority)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`text-sm font-semibold text-gray-900 truncate pr-2 ${
                          !notif.acknowledged ? 'font-bold' : 'font-normal'
                        }`}>
                          {notif.alertName || notif.title || 'System Alert'}
                        </h4>
                        {getSeverityBadge(notif.severity || notif.priority)}
                      </div>
                      
                      <p className="text-xs text-gray-600 mb-1 truncate">
                        {notif.message || notif.description || 'No description available'}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="font-medium">
                          Vehicle: {notif.vehicleNumber || notif.imei || 'Unknown'}
                        </span>
                        <span>{formatRelativeTime(notif.createdAt || notif.timestamp || notif.gpsTimestamp)}</span>
                      </div>

                      {/* Speed if available */}
                      {notif.speed && (
                        <div className="text-xs text-gray-500">
                          Speed: {notif.speed} km/h
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(notif);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteFromDropdown(e, notif._id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  onClose();
                  window.location.href = '/admin/notifications';
                }}
              >
                View All Notifications
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Notification Details Modal */}
      <NotificationDetailsModal
        notification={selectedNotification}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedNotification(null);
        }}
        onDelete={handleDelete}
      />
    </>
  );
}
