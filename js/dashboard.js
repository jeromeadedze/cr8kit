/**
 * Dashboard JavaScript
 * Cr8Kit - Ghana Creative Rentals Platform
 */

// Dashboard initialization
document.addEventListener('DOMContentLoaded', function() {
    // Update user info (avatar)
    if (window.updateUserInfo) {
        window.updateUserInfo();
    }
    loadDashboardData();
});

// Load dashboard data based on user role
async function loadDashboardData() {
    try {
        const userId = await window.getCurrentUserId();
        if (!userId) {
            console.error("User not authenticated");
            return;
        }

        // Get user role
        const { data: user } = await window.supabaseClient
            .from("users")
            .select("role")
            .eq("user_id", userId)
            .single();

        if (user?.role === 'owner') {
            await loadOwnerDashboard(userId);
        } else {
            await loadRenterDashboard(userId);
        }
    } catch (error) {
        console.error("Error loading dashboard:", error);
        // Fallback to renter dashboard
        loadRenterDashboard();
    }
}

// Load owner dashboard data
async function loadOwnerDashboard(userId) {
    try {
        // Get total earned (from completed bookings with paid status)
        const { data: completedBookings } = await window.supabaseClient
            .from("bookings")
            .select("total_amount, payment_status")
            .eq("owner_id", userId)
            .eq("status", "completed")
            .eq("payment_status", "paid");

        const totalEarned = (completedBookings || []).reduce(
            (sum, b) => sum + parseFloat(b.total_amount || 0),
            0
        );

        // Get pending payout (approved bookings with pending payment)
        const { data: pendingBookings } = await window.supabaseClient
            .from("bookings")
            .select("total_amount")
            .eq("owner_id", userId)
            .eq("status", "approved")
            .eq("payment_status", "pending");

        const pendingPayout = (pendingBookings || []).reduce(
            (sum, b) => sum + parseFloat(b.total_amount || 0),
            0
        );

        // Get active listings count
        const { data: activeListings } = await window.supabaseClient
            .from("equipment")
            .select("equipment_id")
            .eq("owner_id", userId)
            .eq("is_available", true);

        const activeCount = activeListings?.length || 0;

        // Update first stat card (total earned)
        const earnedCard = document.querySelectorAll('.stat-card')[0];
        if (earnedCard) {
            const value = earnedCard.querySelector('.stat-value');
            if (value) value.textContent = `GHC ${totalEarned.toLocaleString()}`;
            const label = earnedCard.querySelector('.stat-label');
            if (label) label.textContent = 'Total Earned';
        }

        // Update pending payout
        const pendingCard = document.querySelectorAll('.stat-card')[1];
        if (pendingCard) {
            const value = pendingCard.querySelector('.stat-value');
            if (value) {
                value.innerHTML = `GHC ${pendingPayout.toLocaleString()} <span style="font-size: 12px; color: var(--text-gray);">Processing</span>`;
            }
            const label = pendingCard.querySelector('.stat-label');
            if (label) label.textContent = 'Pending Payout';
        }

        // Update active listings
        const listingsCard = document.querySelectorAll('.stat-card')[2];
        if (listingsCard) {
            const value = listingsCard.querySelector('.stat-value');
            if (value) value.textContent = `${activeCount} Items`;
            const label = listingsCard.querySelector('.stat-label');
            if (label) label.textContent = 'Active Listings';
        }
    } catch (error) {
        console.error("Error loading owner dashboard:", error);
    }
}

// Load renter dashboard data
async function loadRenterDashboard(userId) {
    try {
        if (!userId) {
            userId = await window.getCurrentUserId();
            if (!userId) return;
        }

        // Get renter bookings
        const { data: bookings } = await window.supabaseClient
            .from("bookings")
            .select("status, payment_status, total_amount")
            .eq("renter_id", userId);

        if (!bookings) return;

        // Calculate stats
        const activeRentals = bookings.filter(
            b => b.status === 'active' || b.status === 'approved'
        ).length;

        const pendingRequests = bookings.filter(
            b => b.status === 'pending'
        ).length;

        const totalSpent = bookings
            .filter(b => b.payment_status === 'paid')
            .reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);

        // Update active rentals
        const activeCard = document.querySelectorAll('.stat-card')[0];
        if (activeCard) {
            const value = activeCard.querySelector('.stat-value');
            if (value) value.textContent = activeRentals;
        }

        // Update pending requests
        const pendingCard = document.querySelectorAll('.stat-card')[1];
        if (pendingCard) {
            const value = pendingCard.querySelector('.stat-value');
            if (value) value.textContent = pendingRequests;
        }

        // Update total spent
        const spentCard = document.querySelectorAll('.stat-card')[2];
        if (spentCard) {
            const value = spentCard.querySelector('.stat-value');
            if (value) value.textContent = `GHC ${totalSpent.toLocaleString()}`;
        }
    } catch (error) {
        console.error("Error loading renter dashboard:", error);
    }
}

