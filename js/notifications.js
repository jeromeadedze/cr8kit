/**
 * Notifications Management
 * Handles fetching, displaying, and managing user notifications
 */

let allNotifications = [];
let filteredNotifications = [];

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", async function () {
  // Update user info (avatar) - call immediately and with retry
  if (window.updateUserInfo) {
    window.updateUserInfo();
    // Retry after a short delay to ensure it runs
    setTimeout(() => {
      if (window.updateUserInfo) {
        window.updateUserInfo();
      }
    }, 500);
  }

  await loadNotifications();
  updateNotificationBadge();

  // Mark all notifications as read when user visits the page
  if (window.location.pathname.includes("notifications.html")) {
    markAllAsReadOnVisit();
  }
});

/**
 * Load notifications from Supabase
 */
async function loadNotifications() {
  try {
    const userId = await window.getCurrentUserId();
    if (!userId) {
      console.error("User not authenticated");
      showEmptyState("Please sign in to view notifications.");
      return;
    }

    const { data: notifications, error } = await window.supabaseClient
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error);
      showEmptyState("Error loading notifications. Please try again.");
      return;
    }

    allNotifications = notifications || [];
    filteredNotifications = [...allNotifications];
    renderNotifications();
    updateNotificationBadge();
  } catch (error) {
    console.error("Error in loadNotifications:", error);
    showEmptyState("Error loading notifications. Please try again.");
  }
}

/**
 * Render notifications to the page
 */
function renderNotifications() {
  const container = document.getElementById("notificationsContainer");
  if (!container) return;

  if (filteredNotifications.length === 0) {
    showEmptyState("You're all caught up! No notifications to display.");
    return;
  }

  // Group notifications by date
  const grouped = groupNotificationsByDate(filteredNotifications);

  let html = "";

  for (const [dateLabel, notifications] of Object.entries(grouped)) {
    html += `<div class="notification-group">
      <h3 class="notification-group-title">${dateLabel}</h3>
      <div class="notification-list">`;

    notifications.forEach((notification) => {
      html += createNotificationCard(notification);
    });

    html += `</div></div>`;
  }

  container.innerHTML = html;
}

/**
 * Group notifications by date (Today, Yesterday, or date)
 */
function groupNotificationsByDate(notifications) {
  const groups = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  notifications.forEach((notification) => {
    const notifDate = new Date(notification.created_at);
    const notifDateOnly = new Date(
      notifDate.getFullYear(),
      notifDate.getMonth(),
      notifDate.getDate()
    );

    let label;
    if (notifDateOnly.getTime() === today.getTime()) {
      label = "TODAY";
    } else if (notifDateOnly.getTime() === yesterday.getTime()) {
      label = "YESTERDAY";
    } else {
      label = notifDate
        .toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
        .toUpperCase();
    }

    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(notification);
  });

  return groups;
}

/**
 * Create HTML for a single notification card
 */
function createNotificationCard(notification) {
  const isRead = notification.is_read;
  const type = notification.type || "";
  const timeAgo = getTimeAgo(notification.created_at);

  // Determine notification styling based on type
  let accentColor = "";
  let icon = "fas fa-bell";
  let iconBg = "var(--text-gray)";

  if (type.includes("booking_request") || type.includes("booking")) {
    accentColor = "var(--primary-orange)";
    icon = "fas fa-calendar-plus";
    iconBg = "rgba(254, 116, 44, 0.1)";
  } else if (type.includes("payment_received")) {
    // Payment received notification (for owners)
    accentColor = "var(--success-green)";
    icon = "fas fa-check-circle";
    iconBg = "rgba(34, 197, 94, 0.1)";
  } else if (type.includes("payment") || type.includes("overdue")) {
    // Payment due/overdue notification (for renters)
    accentColor = "var(--error-red)";
    icon = "fas fa-exclamation-circle";
    iconBg = "rgba(220, 38, 38, 0.1)";
  } else if (type.includes("approved")) {
    accentColor = "var(--success-green)";
    icon = "fas fa-check-circle";
    iconBg = "rgba(34, 197, 94, 0.1)";
  } else if (type.includes("message")) {
    icon = "fas fa-comment";
    iconBg = "rgba(107, 114, 128, 0.1)";
  }

  // Get action button based on type
  let actionButton = "";
  if (type.includes("booking_request")) {
    const bookingId = notification.related_booking_id || "null";
    actionButton = `<button class="notification-action-btn" onclick="handleBookingRequest(${notification.notification_id}, ${bookingId})">Review</button>`;
  } else if (type.includes("payment_received")) {
    // Payment received - owner should view booking details
    const bookingId = notification.related_booking_id || "null";
    actionButton = `<button class="notification-action-btn" style="background: var(--success-green);" onclick="handleViewBookingDetails(${notification.notification_id}, ${bookingId})">View Details</button>`;
  } else if (type.includes("payment") || type.includes("overdue")) {
    // Payment due/overdue - renter needs to pay
    actionButton = `<button class="notification-action-btn" style="background: var(--error-red);" onclick="handlePaymentAction(${notification.notification_id})">Pay Now</button>`;
  } else if (type.includes("approved")) {
    actionButton = `<button class="notification-action-btn" onclick="handleViewBooking(${notification.related_booking_id})">View Booking</button>`;
  } else if (type.includes("message")) {
    actionButton = `<button class="notification-action-btn" onclick="handleReply(${notification.notification_id})">Reply</button>`;
  }

  return `
    <div class="notification-card ${
      isRead ? "read" : "unread"
    }" data-notification-id="${notification.notification_id}">
      ${
        !isRead
          ? `<div class="notification-accent" style="background: ${
              accentColor || "transparent"
            };"></div>`
          : ""
      }
      <div class="notification-icon" style="background: ${iconBg};">
        <i class="${icon}" style="color: ${
    accentColor || "var(--text-gray)"
  };"></i>
      </div>
      <div class="notification-content">
        <div class="notification-header">
          <h4 class="notification-title">${escapeHtml(notification.title)}</h4>
          <span class="notification-time" style="color: ${
            accentColor || "var(--text-gray)"
          };">${timeAgo}</span>
        </div>
        <p class="notification-message">${formatNotificationMessage(
          notification.message
        )}</p>
      </div>
      <div class="notification-actions">
        ${
          !isRead
            ? `<span class="notification-dot" style="background: ${
                accentColor || "var(--error-red)"
              };"></span>`
            : ""
        }
        ${actionButton}
        <button class="notification-more-btn" onclick="showNotificationMenu(${
          notification.notification_id
        })">
          <i class="fas fa-ellipsis-v"></i>
        </button>
      </div>
    </div>
  `;
}

/**
 * Format notification message (support basic markdown-like formatting)
 */
function formatNotificationMessage(message) {
  if (!message) return "";
  // Convert **text** to <strong>text</strong>
  return escapeHtml(message).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get time ago string
 */
function getTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  // Format as date if older
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Filter notifications
 */
function filterNotifications(filter) {
  // Update active filter button
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.filter === filter) {
      btn.classList.add("active");
    }
  });

  if (filter === "all") {
    filteredNotifications = [...allNotifications];
  } else if (filter === "unread") {
    filteredNotifications = allNotifications.filter((n) => !n.is_read);
  } else if (filter === "booking") {
    filteredNotifications = allNotifications.filter(
      (n) => n.type && (n.type.includes("booking") || n.type.includes("rental"))
    );
  } else if (filter === "payment") {
    filteredNotifications = allNotifications.filter(
      (n) => n.type && n.type.includes("payment")
    );
  }

  renderNotifications();
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead() {
  try {
    const userId = await window.getCurrentUserId();
    if (!userId) return;

    const unreadIds = allNotifications
      .filter((n) => !n.is_read)
      .map((n) => n.notification_id);

    if (unreadIds.length === 0) {
      return;
    }

    const { error } = await window.supabaseClient
      .from("notifications")
      .update({ is_read: true })
      .in("notification_id", unreadIds);

    if (error) {
      console.error("Error marking notifications as read:", error);
      return;
    }

    // Update local state
    allNotifications.forEach((n) => {
      if (!n.is_read) {
        n.is_read = true;
      }
    });

    filteredNotifications = [...allNotifications];
    renderNotifications();
    updateNotificationBadge();
  } catch (error) {
    console.error("Error in markAllAsRead:", error);
  }
}

/**
 * Mark all as read when user visits notifications page
 */
async function markAllAsReadOnVisit() {
  try {
    const userId = await window.getCurrentUserId();
    if (!userId) return;

    const unreadIds = allNotifications
      .filter((n) => !n.is_read)
      .map((n) => n.notification_id);

    if (unreadIds.length === 0) return;

    const { error } = await window.supabaseClient
      .from("notifications")
      .update({ is_read: true })
      .in("notification_id", unreadIds);

    if (error) {
      console.error("Error marking notifications as read on visit:", error);
      return;
    }

    // Update local state
    allNotifications.forEach((n) => {
      n.is_read = true;
    });

    updateNotificationBadge();
  } catch (error) {
    console.error("Error in markAllAsReadOnVisit:", error);
  }
}

/**
 * Mark a single notification as read
 */
async function markAsRead(notificationId) {
  try {
    const { error } = await window.supabaseClient
      .from("notifications")
      .update({ is_read: true })
      .eq("notification_id", notificationId);

    if (error) {
      console.error("Error marking notification as read:", error);
      return;
    }

    // Update local state
    const notification = allNotifications.find(
      (n) => n.notification_id === notificationId
    );
    if (notification) {
      notification.is_read = true;
    }

    renderNotifications();
    updateNotificationBadge();
  } catch (error) {
    console.error("Error in markAsRead:", error);
  }
}

/**
 * Update notification badge in nav bar
 */
async function updateNotificationBadge() {
  try {
    const userId = await window.getCurrentUserId();
    if (!userId) {
      // Hide badge if not authenticated
      const badges = document.querySelectorAll("#navNotificationBadge");
      badges.forEach((badge) => (badge.style.display = "none"));
      return;
    }

    // If on notifications page, hide badge (notifications will be marked as read)
    if (window.location.pathname.includes("notifications.html")) {
      const badges = document.querySelectorAll("#navNotificationBadge");
      badges.forEach((badge) => (badge.style.display = "none"));
      return;
    }

    // Get unread count from loaded notifications
    const unreadCount = allNotifications.filter((n) => !n.is_read).length;

    const badges = document.querySelectorAll("#navNotificationBadge");
    badges.forEach((badge) => {
      if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? "99+" : unreadCount;
        badge.style.display = "flex";
      } else {
        badge.style.display = "none";
      }
    });
  } catch (error) {
    console.error("Error updating notification badge:", error);
  }
}

/**
 * Show empty state
 */
function showEmptyState(message) {
  const container = document.getElementById("notificationsContainer");
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-bell-slash"></i>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }
}

/**
 * Handle booking request action
 */
function handleBookingRequest(notificationId, bookingId) {
  // Mark notification as read
  markAsRead(notificationId);

  // Redirect to my-listings page with requests tab
  if (bookingId && bookingId !== "null" && bookingId !== null) {
    window.location.href = `my-listings.html?tab=requests&booking=${bookingId}`;
  } else {
    window.location.href = `my-listings.html?tab=requests`;
  }
}

/**
 * Handle payment received - view booking details
 */
function handleViewBookingDetails(notificationId, bookingId) {
  // Mark notification as read
  markAsRead(notificationId);

  // Redirect to bookings page with the specific booking
  if (bookingId && bookingId !== "null" && bookingId !== null) {
    window.location.href = `bookings.html?booking=${bookingId}`;
  } else {
    window.location.href = `bookings.html`;
  }
}

/**
 * Handle payment action (for payment due/overdue)
 */
function handlePaymentAction(notificationId) {
  markAsRead(notificationId);
  window.location.href = `bookings.html?tab=payments`;
}

/**
 * Handle view booking
 */
function handleViewBooking(bookingId) {
  if (bookingId) {
    window.location.href = `bookings.html?booking=${bookingId}`;
  } else {
    window.location.href = `bookings.html`;
  }
}

/**
 * Handle reply to message
 */
function handleReply(notificationId) {
  markAsRead(notificationId);
  // TODO: Navigate to messages/chat page when implemented
  console.log("Reply to notification:", notificationId);
}

/**
 * Show notification menu (for future use)
 */
function showNotificationMenu(notificationId) {
  // TODO: Implement dropdown menu for notification actions
  console.log("Show menu for notification:", notificationId);
}

// Make functions globally available
window.updateNotificationBadge = updateNotificationBadge;
window.filterNotifications = filterNotifications;
window.markAllAsRead = markAllAsRead;
window.handleBookingRequest = handleBookingRequest;
window.handleViewBookingDetails = handleViewBookingDetails;
window.handlePaymentAction = handlePaymentAction;
window.handleViewBooking = handleViewBooking;
window.handleReply = handleReply;
window.showNotificationMenu = showNotificationMenu;
