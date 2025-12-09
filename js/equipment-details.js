/**
 * Equipment Details Page JavaScript
 * Cr8Kit - Ghana Creative Rentals Platform
 */

document.addEventListener("DOMContentLoaded", function () {
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

    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 4;

    const pricePerDay = 500;
    const basePrice = pricePerDay * days;
    const serviceFee = 150;
    const insurance = 100;
    const total = basePrice + serviceFee + insurance;

    // Update breakdown
    const breakdownRows = document.querySelectorAll(".breakdown-row");
    if (breakdownRows[0]) {
      breakdownRows[0].innerHTML = `<span>GHC ${pricePerDay} x ${days} days</span><span>GHC ${basePrice.toLocaleString()}</span>`;
    }

    const totalElement = document.querySelector(
      ".breakdown-total span:last-child"
    );
    if (totalElement) {
      totalElement.textContent = `GHC ${total.toLocaleString()}`;
    }
  }
}

// Initialize booking form
function initBookingForm() {
  const bookButton = document.querySelector(".btn-book-request");

  if (bookButton) {
    bookButton.addEventListener("click", function () {
      const startInput = document.getElementById("startDateInput");
      const endInput = document.getElementById("endDateInput");

      if (!startInput || !endInput || !startInput.value || !endInput.value) {
        alert("Please select start and end dates");
        return;
      }

      // In real app, this would submit to backend
      alert("Booking request submitted! (This is a demo)");
    });
  }

  // Calculate initial total
  calculateTotal();
}
