"use client";

import React, { useState, useMemo } from "react";
import { 
    AlertTriangle, 
    ShieldX, 
    Activity, 
    AlertCircle, 
    MapPin, 
    Bell, 
    Calendar,
    Filter,
    Search,
    Car,
    RefreshCw,
    X
} from "lucide-react";
import { useGetNotificationsQuery, useMarkAsReadMutation, useDeleteNotificationMutation, useClearAllNotificationsMutation } from "@/redux/api/notificationsApi";
import { useGetVehiclesQuery } from "@/redux/api/vehicleApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Alert type icons
const getAlertIcon = (type: string, severity: string) => {
  const iconClass = "w-5 h-5";
  
  if (type?.toLowerCase().includes("overspeed") || type?.toLowerCase().includes("speed")) {
    return <AlertTriangle className={`${iconClass} text-amber-500`} />;
  }
  if (type?.toLowerCase().includes("ignition")) {
    return severity?.toLowerCase().includes("on") ? 
      <Activity className={`${iconClass} text-green-500`} /> : 
      <ShieldX className={`${iconClass} text-gray-500`} />;
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
  
  return <AlertCircle className={`${iconClass} text-gray-500`} />;
};

// Severity badge styles
const getSeverityBadge = (severity: string) => {
  const severityLower = severity?.toLowerCase();
  
  if (severityLower?.includes("critical") || severityLower?.includes("emergency")) {
    return <Badge variant="destructive" className="text-xs font-bold">CRITICAL</Badge>;
  }
  if (severityLower?.includes("warning") || severityLower?.includes("medium")) {
    return <Badge variant="warning" className="text-xs font-bold">WARNING</Badge>;
  }
  if (severityLower?.includes("info") || severityLower?.includes("low")) {
    return <Badge variant="default" className="text-xs font-bold">INFO</Badge>;
  }
  
  return <Badge variant="secondary" className="text-xs font-bold">NORMAL</Badge>;
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

// Format date for display
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-GB", { 
    day: "2-digit", 
    month: "short", 
    year: "numeric" 
  });
};

export default function NotificationsPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedAlertType, setSelectedAlertType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // API hooks
  const { data: notificationsData, isLoading, error, refetch } = useGetNotificationsQuery(undefined, {
    pollingInterval: 30000,
  });
  const { data: vehiclesData } = useGetVehiclesQuery(undefined);
  const [markAsRead] = useMarkAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const [clearAllNotifications] = useClearAllNotificationsMutation();

  const notifications = notificationsData?.data || [];
  const vehicles = vehiclesData?.data || vehiclesData?.vehicles || [];

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif: any) => {
      const notifDate = new Date(notif.createdAt || notif.timestamp).toISOString().split('T')[0];
      const matchesDate = !selectedDate || notifDate === selectedDate;
      const matchesVehicle = !selectedVehicle || notif.vehicleNumber?.toLowerCase().includes(selectedVehicle.toLowerCase());
      const matchesType = !selectedAlertType || notif.title?.toLowerCase().includes(selectedAlertType.toLowerCase());
      const matchesSearch = !searchQuery || 
        notif.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notif.vehicleNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notif.message?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesDate && matchesVehicle && matchesType && matchesSearch;
    });
  }, [notifications, selectedDate, selectedVehicle, selectedAlertType, searchQuery]);

  // Group notifications by vehicle for visual grouping
  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    
    filteredNotifications.forEach((notif: any) => {
      const vehicleKey = notif.vehicleNumber || notif.imei || 'Unknown';
      if (!groups[vehicleKey]) {
        groups[vehicleKey] = [];
      }
      groups[vehicleKey].push(notif);
    });
    
    return groups;
  }, [filteredNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId).unwrap();
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (confirm("Are you sure you want to delete this notification?")) {
      try {
        await deleteNotification(notificationId).unwrap();
        refetch();
      } catch (error) {
        console.error("Failed to delete notification:", error);
      }
    }
  };

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to clear all notifications?")) {
      try {
        await clearAllNotifications(undefined).unwrap();
        refetch();
      } catch (error) {
        console.error("Failed to clear notifications:", error);
      }
    }
  };

  const handleRetry = () => {
    refetch();
  };

  // Get unique alert types for filter
  const alertTypes = useMemo(() => {
    const types = new Set<string>();
    notifications.forEach((notif: any) => {
      if (notif.title) types.add(notif.title);
    });
    return Array.from(types);
  }, [notifications]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to load notifications</h1>
          <p className="text-gray-600 mb-4">There was an error loading your notifications.</p>
          <Button onClick={handleRetry} className="bg-blue-600 hover:bg-blue-700 text-white">
            <RefreshCw size={16} className="mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-black text-gray-900 mb-2">Notifications</h1>
            <p className="text-gray-600">Loading your notifications...</p>
          </div>
          
          {/* Skeleton table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-600">Time</th>
                    <th className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-600">Vehicle</th>
                    <th className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-600">Alert Type</th>
                    <th className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-600">Message</th>
                    <th className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-600">Severity</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...Array(10)].map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Notifications</h1>
              <p className="text-gray-600">View and manage all system alerts</p>
            </div>
            
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span>Total: {notifications.length}</span>
              <span>•</span>
              <span>Unread: {notifications.filter((n: any) => !n.read).length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Date Range Filter */}
            <div className="flex-1 min-w-0">
              <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-600">
                <Calendar className="inline w-3 h-3 mr-1" />
                Date Range
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Filter by date"
              />
            </div>

            {/* Vehicle Filter */}
            <div className="flex-1 min-w-0">
              <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-600">
                <Car className="inline w-3 h-3 mr-1" />
                Vehicle Filter
              </label>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Vehicles</option>
                {vehicles.map((vehicle: any) => (
                  <option key={vehicle._id} value={vehicle.vehicleNumber || vehicle.registrationNumber}>
                    {vehicle.vehicleNumber || vehicle.registrationNumber}
                  </option>
                ))}
              </select>
            </div>

            {/* Alert Type Filter */}
            <div className="flex-1 min-w-0">
              <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-600">
                <AlertTriangle className="inline w-3 h-3 mr-1" />
                Alert Type
              </label>
              <select
                value={selectedAlertType}
                onChange={(e) => setSelectedAlertType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                {alertTypes.map((type: string) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex-1 min-w-0">
              <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-600">
                <Filter className="inline w-3 h-3 mr-1" />
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-0">
              <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-600">
                <Search className="inline w-3 h-3 mr-1" />
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Search notifications..."
              />
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2">
              <Button
                onClick={handleClearAll}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-50"
                disabled={notifications.length === 0}
              >
                <X size={14} className="mr-2" />
                Clear All
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {filteredNotifications.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
            <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications found</h3>
            <p className="text-gray-600 mb-4">Try changing the date or clearing filters</p>
            <p className="text-sm text-gray-500">No alerts match your current filter criteria</p>
          </div>
        ) : (
          /* Grouped Notifications */
          <div className="space-y-4">
            {Object.entries(groupedNotifications).map(([vehicleNumber, vehicleNotifications]) => (
              <div key={vehicleNumber} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Vehicle Group Header */}
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Car className="w-5 h-5 text-gray-600" />
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{vehicleNumber}</h3>
                      <p className="text-xs text-gray-500">
                        {vehicleNotifications.length} alert{vehicleNotifications.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    {getSeverityBadge(vehicleNotifications[0]?.severity || vehicleNotifications[0]?.priority)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Last alert: {formatRelativeTime(vehicleNotifications[0]?.createdAt || vehicleNotifications[0]?.timestamp)}

          {/* Status Filter */}
          <div className="flex-1 min-w-0">
            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-600">
              <Filter className="inline w-3 h-3 mr-1" />
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-0">
            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-600">
              <Search className="inline w-3 h-3 mr-1" />
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Search notifications..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-end gap-2">
            <Button
              onClick={handleClearAll}
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-50"
              disabled={notifications.length === 0}
            >
              <X size={14} className="mr-2" />
              Clear All
            </Button>
          </div>
        </div>
      </div>

                {/* Notifications List */}
                <div className="divide-y divide-gray-100">
                  {vehicleNotifications.slice(0, 5).map((notif: any) => (
                    <div
                      key={notif._id}
                      className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                        !notif.read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Alert Icon */}
                        <div className="flex-shrink-0">
                          {getAlertIcon(notif.title || notif.type || 'Alert', notif.severity || notif.priority)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-semibold text-gray-900">
                              {notif.title || 'System Alert'}
                            </h4>
                            <div className="flex items-center gap-2">
                              {getSeverityBadge(notif.severity || notif.priority)}
                              {!notif.read && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-1">
                            {notif.message || notif.description || 'No description available'}
                          </p>
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span className="font-medium">
                              Speed: {notif.speed || 'N/A'} km/h
                            </span>
                            <span>{formatRelativeTime(notif.createdAt || notif.timestamp)}</span>
                          </div>

                          {/* Location */}
                          {notif.address && (
                            <div className="text-xs text-gray-500">
                              📍 {notif.address}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          {!notif.read && (
                            <Button
                              onClick={() => handleMarkAsRead(notif._id)}
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            >
                              Mark as Read
                            </Button>
                          )}
                          <Button
                            onClick={() => handleDelete(notif._id)}
                            variant="outline"
                            size="sm"
                            className="text-xs border-red-300 text-red-700 hover:bg-red-50"
                          >
                            <X size={12} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
