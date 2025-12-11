/**
 * Equipment Details Page JavaScript
 * Cr8Kit - Ghana Creative Rentals Platform
 */

document.addEventListener("DOMContentLoaded", function () {
  // Update user info (avatar, host name)
  if (window.updateUserInfo) {
    window.updateUserInfo();
  }
  // Load equipment details from API
  loadEquipmentDetails();

  // Set initial selected dates
  selectedStartDay = 10;
  selectedEndDay = 13;

  // Initialize calendar interactions
  initCalendar();

  // Initialize date pickers
  initDatePickers();

  // Initialize booking form
  initBookingForm();

  // Update initial calendar display
  updateCalendarDisplay();
});

// Update calendar display with selected dates
function updateCalendarDisplay() {
  const calendarDays = document.querySelectorAll(
    ".calendar-day:not(.calendar-day-header)"
  );

  calendarDays.forEach((day) => {
    const dayNumber = parseInt(day.textContent);
    if (!isNaN(dayNumber) && selectedStartDay && selectedEndDay) {
      if (dayNumber >= selectedStartDay && dayNumber <= selectedEndDay) {
        day.classList.add("selected");
        if (dayNumber === selectedStartDay) day.classList.add("start");
        if (dayNumber === selectedEndDay) day.classList.add("end");
      }
    }
  });
}

// Initialize calendar
let selectedStartDay = null;
let selectedEndDay = null;

function initCalendar() {
  const calendarDays = document.querySelectorAll(
    ".calendar-day:not(.calendar-day-header)"
  );

  calendarDays.forEach((day) => {
    day.addEventListener("click", function () {
      const dayNumber = parseInt(this.textContent);
      if (isNaN(dayNumber)) return;

      // If no start selected or clicking before start, set as new start
      if (!selectedStartDay || dayNumber < selectedStartDay) {
        // Clear all selections
        document.querySelectorAll(".calendar-day.selected").forEach((d) => {
          d.classList.remove("selected", "start", "end");
        });

        selectedStartDay = dayNumber;
        selectedEndDay = null;
        this.classList.add("selected", "start");
      }
      // If start selected and clicking after start, set as end
      else if (selectedStartDay && dayNumber >= selectedStartDay) {
        selectedEndDay = dayNumber;

        // Select all days in range
        calendarDays.forEach((d) => {
          const dNum = parseInt(d.textContent);
          if (
            !isNaN(dNum) &&
            dNum >= selectedStartDay &&
            dNum <= selectedEndDay
          ) {
            d.classList.add("selected");
            if (dNum === selectedStartDay) d.classList.add("start");
            if (dNum === selectedEndDay) d.classList.add("end");
          } else if (!isNaN(parseInt(d.textContent))) {
            d.classList.remove("selected", "start", "end");
          }
        });
      }

      // Update date inputs
      updateBookingDates();
    });
  });
}

// Initialize date pickers
function initDatePickers() {
  const startInput = document.getElementById("startDateInput");
  const endInput = document.getElementById("endDateInput");

  if (startInput && endInput) {
    startInput.addEventListener("click", function () {
      // Scroll to calendar section
      const calendar = document.querySelector(".calendar-container");
      if (calendar) {
        calendar.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });

    endInput.addEventListener("click", function () {
      // Scroll to calendar section
      const calendar = document.querySelector(".calendar-container");
      if (calendar) {
        calendar.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }
}

// Update booking dates from calendar selection
function updateBookingDates() {
  if (selectedStartDay) {
    const startDay = selectedStartDay.toString().padStart(2, "0");
    const endDay = (selectedEndDay || selectedStartDay)
      .toString()
      .padStart(2, "0");

    // Update inputs
    const startInput = document.getElementById("startDateInput");
    const endInput = document.getElementById("endDateInput");

    if (startInput) startInput.value = `10/${startDay}/2023`;
    if (endInput) endInput.value = `10/${endDay}/2023`;

    // Recalculate total
    calculateTotal();
  }
}

// Calculate booking total
function calculateTotal() {
  const startInput = document.getElementById("startDateInput");
  const endInput = document.getElementById("endDateInput");

  if (startInput && endInput && startInput.value && endInput.value) {
    // Parse dates (format: MM/DD/YYYY)
    const startParts = startInput.value.split("/");
    const endParts = endInput.value.split("/");

    const startDate = new Date(
      parseInt(startParts[2]),
      parseInt(startParts[0]) - 1,
      parseInt(startParts[1])
    );
    const endDate = new Date(
      parseInt(endParts[2]),
      parseInt(endParts[0]) - 1,
      parseInt(endParts[1])
    );

    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1 || 1;

    // Get price from equipment data or use default
    const pricePerDay = window.equipmentPrice || 500;
    const basePrice = pricePerDay * days;
    const serviceFee = Math.round(basePrice * 0.1); // 10% service fee
    const insurance = Math.round(basePrice * 0.05); // 5% insurance
    const total = basePrice + serviceFee + insurance;

    // Update breakdown
    const breakdownRows = document.querySelectorAll(".breakdown-row");
    if (breakdownRows[0]) {
      breakdownRows[0].innerHTML = `<span>GHC ${pricePerDay.toLocaleString()} x ${days} days</span><span>GHC ${basePrice.toLocaleString()}</span>`;
    }
    if (breakdownRows[1]) {
      breakdownRows[1].innerHTML = `<span>Service fee</span><span>GHC ${serviceFee.toLocaleString()}</span>`;
    }
    if (breakdownRows[2]) {
      breakdownRows[2].innerHTML = `<span>Insurance</span><span>GHC ${insurance.toLocaleString()}</span>`;
    }

    const totalElement = document.querySelector(
      ".breakdown-total span:last-child"
    );
    if (totalElement) {
      totalElement.textContent = `GHC ${total.toLocaleString()}`;
    }
  }
}

// Load equipment details from Supabase
async function loadEquipmentDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const equipmentId = urlParams.get('id');
  
  if (!equipmentId) {
    console.error("Equipment ID not found in URL");
    return;
  }

  try {
    // Get equipment details with owner info
    const { data: equipment, error } = await window.supabaseClient
      .from("equipment")
      .select(`
        *,
        owner:owner_id (
          user_id,
          full_name,
          email,
          phone_number,
          rating
        )
      `)
      .eq("equipment_id", equipmentId)
      .single();

    if (error) {
      throw error;
    }

    if (!equipment) {
      console.error("Equipment not found");
      return;
    }

    // Get equipment images
    const { data: images } = await window.supabaseClient
      .from("equipment_images")
      .select("image_url, is_primary")
      .eq("equipment_id", equipmentId)
      .order("is_primary", { ascending: false });

    // Store price for calculations
    window.equipmentPrice = parseFloat(equipment.price_per_day);
    
    // Update page title
    if (document.querySelector('.equipment-title')) {
      document.querySelector('.equipment-title').textContent = equipment.name;
    }
    
    // Update price display
    if (document.querySelector('.price-amount')) {
      document.querySelector('.price-amount').textContent = `GHC ${equipment.price_per_day.toLocaleString()}`;
    }
    
    // Update location
    if (document.querySelector('.location-text')) {
      document.querySelector('.location-text').textContent = `${equipment.location}, ${equipment.city}`;
    }
    
    // Update description
    if (document.querySelector('.description-text')) {
      document.querySelector('.description-text').textContent = equipment.description || 'No description available.';
    }
    
    // Update images if available
    const imageList = images && images.length > 0 
      ? images.map(img => ({ url: img.image_url }))
      : equipment.image_url 
        ? [{ url: equipment.image_url }]
        : [];

    if (imageList.length > 0) {
      const mainImage = document.querySelector('.main-image img');
      if (mainImage && imageList[0]) {
        mainImage.src = imageList[0].url;
        mainImage.alt = equipment.name;
      }
    }

    // Update owner/host information
    if (equipment.owner) {
      const ownerName = equipment.owner.full_name || equipment.owner.email || 'Owner';
      const hostAvatar = document.querySelector('.host-avatar');
      const hostName = document.querySelector('.host-name');
      
      if (hostAvatar) {
        hostAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(ownerName)}&background=fe742c&color=fff&size=60`;
        hostAvatar.alt = ownerName;
      }
      
      if (hostName) {
        hostName.textContent = `Hosted by ${ownerName}`;
      }
    }
    
    // Recalculate total with actual price
    calculateTotal();

  } catch (error) {
    console.error("Error loading equipment details:", error);
  }
}

// Initialize booking form
function initBookingForm() {
  const bookButton = document.querySelector(".btn-book-request");

  if (bookButton) {
    bookButton.addEventListener("click", function (e) {
      e.preventDefault();
      
      const startInput = document.getElementById("startDateInput");
      const endInput = document.getElementById("endDateInput");

      if (!startInput || !endInput || !startInput.value || !endInput.value) {
        alert("Please select start and end dates");
        return;
      }

      // Get equipment ID from URL
      const urlParams = new URLSearchParams(window.location.search);
      const equipmentId = urlParams.get('id');
      
      if (!equipmentId) {
        alert("Equipment ID not found");
        return;
      }

      // Parse dates (format: MM/DD/YYYY)
      const startParts = startInput.value.split("/");
      const endParts = endInput.value.split("/");
      
      // Convert to YYYY-MM-DD format for API
      const startDate = `${startParts[2]}-${startParts[0].padStart(2, '0')}-${startParts[1].padStart(2, '0')}`;
      const endDate = `${endParts[2]}-${endParts[0].padStart(2, '0')}-${endParts[1].padStart(2, '0')}`;

      // Disable button and show loading
      bookButton.disabled = true;
      const originalText = bookButton.textContent;
      bookButton.textContent = "Submitting...";

      // Create booking in Supabase
      createBooking(equipmentId, startDate, endDate, bookButton, originalText);
    });
  }

  // Calculate initial total
  calculateTotal();
}

// Create booking in Supabase
async function createBooking(equipmentId, startDate, endDate, bookButton, originalText) {
  try {
    const userId = await window.getCurrentUserId();
    if (!userId) {
      bookButton.disabled = false;
      bookButton.textContent = originalText;
      alert("Please sign in to create a booking.");
      return;
    }

    // Get equipment details
    const { data: equipment, error: equipError } = await window.supabaseClient
      .from("equipment")
      .select("owner_id, price_per_day, is_available")
      .eq("equipment_id", equipmentId)
      .single();

    if (equipError || !equipment) {
      throw new Error("Equipment not found");
    }

    if (!equipment.is_available) {
      bookButton.disabled = false;
      bookButton.textContent = originalText;
      alert("This equipment is not available for booking.");
      return;
    }

    if (equipment.owner_id === userId) {
      bookButton.disabled = false;
      bookButton.textContent = originalText;
      alert("You cannot book your own equipment.");
      return;
    }

    // Check for date conflicts
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const { data: conflictingBookings } = await window.supabaseClient
      .from("bookings")
      .select("booking_id")
      .eq("equipment_id", equipmentId)
      .in("status", ["pending", "approved", "active"])
      .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

    if (conflictingBookings && conflictingBookings.length > 0) {
      bookButton.disabled = false;
      bookButton.textContent = originalText;
      alert("This equipment is not available for the selected dates.");
      return;
    }

    // Calculate total
    const pricePerDay = parseFloat(equipment.price_per_day);
    const totalAmount = pricePerDay * totalDays;

    // Generate booking number
    const bookingNumber = window.generateBookingNumber();

    // Create booking
    const { data: booking, error: bookingError } = await window.supabaseClient
      .from("bookings")
      .insert({
        renter_id: userId,
        equipment_id: parseInt(equipmentId),
        owner_id: equipment.owner_id,
        booking_number: bookingNumber,
        start_date: startDate,
        end_date: endDate,
        total_days: totalDays,
        price_per_day: pricePerDay,
        total_amount: totalAmount,
        status: "pending",
        payment_status: "pending"
      })
      .select()
      .single();

    if (bookingError) {
      throw bookingError;
    }

    bookButton.disabled = false;
    bookButton.textContent = originalText;

    alert("Booking request submitted successfully! The owner will review your request.");
    // Optionally redirect to bookings page
    // window.location.href = 'bookings.html';

  } catch (error) {
    bookButton.disabled = false;
    bookButton.textContent = originalText;
    console.error("Booking error:", error);
    alert("Error: " + (error.message || "Failed to create booking"));
  }
}
