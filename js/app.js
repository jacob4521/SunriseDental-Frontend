// Put the backend API base URL here.
const API_BASE_URL = "http://localhost:8080";

// --- පොදු API Function එක (Authorized Fetch Wrapper) ---
async function fetchWithAuth(endpoint, options = {}) {
  // 1. LocalStorage එකෙන් Token එක ගන්න
  const token = localStorage.getItem("jwtToken");

  // 2. Headers සකස් කිරීම
  const headers = new Headers(options.headers || {});

  if (token) {
    // Token එක තියෙනවා නම් Authorization header එකට එකතු කරන්න
    headers.append("Authorization", `Bearer ${token}`);
  }

  // Default Content-Type එක JSON විදිහට සකස් කිරීම
  if (!headers.has("Content-Type")) {
    headers.append("Content-Type", "application/json");
  }

  // අලුත් Headers ටික Options වලට ඇතුළත් කිරීම
  const config = {
    ...options,
    headers: headers,
  };

  try {
    // 3. Fetch Request එක යැවීම
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // 4. Token එක Expire වෙලා නම් හෝ අවලංගු නම්
    if (response.status === 401) {
      console.error("Session expired or unauthorized. Logging out...");
      localStorage.removeItem("jwtToken");
      localStorage.removeItem("userRole");
      showSection("login-section");
      throw new Error("Unauthorized");
    }

    return response; // සාර්ථක වුණොත් Response එක Return කරනවා
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
}

// --- 1. Function to show a specific section ---
function showSection(sectionId) {
  // First hide all sections
  document.getElementById("login-section").style.display = "none";
  document.getElementById("patients-section").style.display = "none";
  document.getElementById("appointments-section").style.display = "none";
  document.getElementById("invoices-section").style.display = "none";

  // Handle the Main Layout Wrapper
  const mainLayout = document.getElementById("main-layout");
  if (sectionId === "login-section") {
    mainLayout.style.display = "none";
    document.getElementById("login-section").style.display = "flex";
  } else {
    mainLayout.style.display = "flex";
  }

  // After that, show the requested section
  document.getElementById(sectionId).style.display = "block";

  // අලුත් කොටස: Appointments පිටුවට යද්දී Dropdowns Load කරන්න
  if (sectionId === "appointments-section") {
    loadAppointmentDropdowns();
  }
}

// --- 2. Login ---
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

if (loginForm) {
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      // Sending a POST request to the backend for login
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();

        // Login successful, storing JWT token and user role in localStorage
        localStorage.setItem("jwtToken", data.token);
        localStorage.setItem("userRole", data.role);

        // Resetting the form and hiding any previous error messages
        loginForm.reset();
        loginError.style.display = "none";

        // Next, show the appointments section (Default)
        showSection("appointments-section");
        applyRoleBasedAccess();
      } else {
        // If login fails, show an error message
        loginError.textContent = "Invalid username or password!";
        loginError.style.display = "block";
      }
    } catch (error) {
      console.error("Login error:", error);
      loginError.textContent = "Server error. Is the backend running?";
      loginError.style.display = "block";
    }
  });
}

// --- 3. Logout ---
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", function () {
    // Delete the JWT token and user role from localStorage
    localStorage.removeItem("jwtToken");
    localStorage.removeItem("userRole");

    // Again, show the login section after logout
    showSection("login-section");
  });
}

// --- 4. Role-Based Access Control (RBAC) ---
function applyRoleBasedAccess() {
  const role = localStorage.getItem("userRole");
  const adminElements = document.querySelectorAll(".admin-only");

  if (role !== "Admin") {
    // Admin නොවේ නම් (උදා: Staff), Admin elements සඟවන්න
    adminElements.forEach((el) => {
      el.style.display = "none";
    });
  } else {
    // Admin නම්, ඒවා පෙන්වන්න
    adminElements.forEach((el) => {
      el.style.display = "inline-block";
    });
  }
}

// --- 5. Page Load වෙද්දී Authentication State එක පරීක්ෂා කිරීම ---
function checkAuthState() {
  const token = localStorage.getItem("jwtToken");

  if (token) {
    // Token එකක් තියෙනවා නම්, කෙලින්ම Appointments එකට යන්න
    showSection("appointments-section");
    applyRoleBasedAccess(); // Role එකට අදාළව UI එක හදන්න
  } else {
    // Token එකක් නැත්නම්, Login එක පෙන්වන්න
    showSection("login-section");
  }
}

// පිටුව මුලින්ම Load වෙද්දී checkAuthState එක Run කරන්න
window.onload = checkAuthState;

// --- 6. Patients Data ලබා ගැනීම (Load Patients) ---
async function loadPatients() {
  try {
    // අර අපි කතා කරපු පේළි දෙක මෙතනට තමයි එන්නේ
    const response = await fetchWithAuth("/patients");

    if (response.ok) {
      const patientsData = await response.json();
      console.log("Patients loaded successfully:", patientsData);

      // ඉදිරියේදී අපි මේ data ටික HTML Table එකකට දාන code එක මෙතන ලියනවා
    } else {
      console.error("Failed to fetch patients.");
    }
  } catch (error) {
    console.error("Error loading patients:", error);
  }
}

// --- 7. Appointment Form UI Logic (Radio Buttons) ---
const newPatientRadio = document.getElementById("new-patient");
const existingPatientRadio = document.getElementById("existing-patient");
const newPatientFields = document.getElementById("new-patient-fields");
const existingPatientFields = document.getElementById(
  "existing-patient-fields",
);

if (newPatientRadio && existingPatientRadio) {
  newPatientRadio.addEventListener("change", () => {
    newPatientFields.style.display = "block";
    existingPatientFields.style.display = "none";
  });

  existingPatientRadio.addEventListener("change", () => {
    newPatientFields.style.display = "none";
    existingPatientFields.style.display = "block";
    // ඉදිරියේදී පවතින රෝගීන් (Patients) ලැයිස්තුව මෙතනින් Load කරමු
  });
}

// --- 8. Load Dentists, Treatments & Patients for Dropdowns ---
async function loadAppointmentDropdowns() {
  try {
    // Dentists ලා ලබා ගැනීම
    const dentistRes = await fetchWithAuth("/dentists");
    if (dentistRes.ok) {
      const dentists = await dentistRes.json();
      const dentistSelect = document.getElementById("dentist-select");

      dentistSelect.innerHTML =
        '<option value="">-- Select Dentist --</option>';
      dentists.forEach((d) => {
        dentistSelect.innerHTML += `<option value="${d.dentistId}">${d.dentistName}</option>`;
      });
    }

    // Treatments ලබා ගැනීම
    const treatmentRes = await fetchWithAuth("/treatments");
    if (treatmentRes.ok) {
      const treatments = await treatmentRes.json();
      const treatmentSelect = document.getElementById("treatment-select");

      treatmentSelect.innerHTML =
        '<option value="">-- Select Treatment --</option>';
      treatments.forEach((t) => {
        treatmentSelect.innerHTML += `<option value="${t.treatmentId}">${t.treatmentType}</option>`;
      });
    }

    // අලුත් කොටස: Patients ලා ලබා ගැනීම
    const patientRes = await fetchWithAuth("/patients");
    if (patientRes.ok) {
      const patients = await patientRes.json();
      const patientSelect = document.getElementById("existing-patient-select");

      patientSelect.innerHTML =
        '<option value="">-- Select Patient --</option>';
      patients.forEach((p) => {
        // නම සහ දුරකථන අංකය දෙකම පෙනෙන පරිදි සකස් කර ඇත
        patientSelect.innerHTML += `<option value="${p.patientId}">${p.patientName} (${p.contactNumber})</option>`;
      });
    }
  } catch (error) {
    console.error("Error loading dropdowns:", error);
  }
}

// --- 9. Submit Appointment Form ---
const appointmentForm = document.getElementById("appointment-form");
if (appointmentForm) {
  appointmentForm.addEventListener("submit", async function (e) {
    e.preventDefault(); // පිටුව Refresh වෙන එක නවත්වන්න

    // 1. Radio button එකෙන් New ද Existing ද කියලා අඳුරගැනීම
    const patientType = document.querySelector(
      'input[name="patient-type"]:checked',
    ).value;
    let finalPatientId = null;

    try {
      if (patientType === "existing") {
        // --- පරණ රෝගියෙක් නම් ---
        finalPatientId = document.getElementById(
          "existing-patient-select",
        ).value;
        if (!finalPatientId) {
          alert("Please select an existing patient.");
          return;
        }
      } else {
        // --- අලුත් රෝගියෙක් නම් ---
        const patientName = document.getElementById("patient-name").value;
        const contactNumber = document.getElementById("contact-number").value;
        const address = document.getElementById("address").value;

        if (!patientName || !contactNumber) {
          alert(
            "Patient Name and Contact Number are required for new patients.",
          );
          return;
        }

        // 1. මේ දුරකථන අංකය දැනටමත් තියෙනවාදැයි පරීක්ෂා කිරීම
        const allPatientsRes = await fetchWithAuth("/patients");
        const allPatients = await allPatientsRes.json();
        const existingPatient = allPatients.find(
          (p) => p.contactNumber === contactNumber,
        );

        if (existingPatient) {
          // අංකය දැනටමත් තිබේ නම්, එම ID එක භාවිතා කරන්න
          finalPatientId = existingPatient.patientId;
          console.log("Patient exists. Using existing ID:", finalPatientId);
        } else {
          // අංකය නොමැති නම්, අලුතින් Save කිරීම
          const patientData = { patientName, contactNumber, address };
          const patientRes = await fetchWithAuth("/patients", {
            method: "POST",
            body: JSON.stringify(patientData),
          });

          if (patientRes.ok) {
            // 201 Created
            // 2. Backend එකෙන් ID එක Return නොකරන නිසා, නැවත Fetch කර අලුත් ID එක සොයාගැනීම
            const updatedPatientsRes = await fetchWithAuth("/patients");
            const updatedPatients = await updatedPatientsRes.json();
            const newlyCreated = updatedPatients.find(
              (p) => p.contactNumber === contactNumber,
            );

            if (newlyCreated) {
              finalPatientId = newlyCreated.patientId;
            } else {
              alert("Could not verify new patient creation.");
              return;
            }
          } else {
            alert("Failed to save new patient. Please check the details.");
            return;
          }
        }
      }

      // --- 3. Appointment එක Save කිරීම (අවසාන පියවර) ---
      const dentistId = document.getElementById("dentist-select").value;
      const treatmentId = document.getElementById("treatment-select").value;
      const appointmentDate = document.getElementById("appointment-date").value;
      const appointmentTime =
        document.getElementById("appointment-time").value + ":00"; // Format: HH:mm:ss

      const appointmentData = {
        patientId: parseInt(finalPatientId),
        dentistId: parseInt(dentistId),
        treatmentId: parseInt(treatmentId),
        appointmentDate: appointmentDate,
        appointmentTime: appointmentTime,
      };

      const appointmentRes = await fetchWithAuth("/appointments", {
        method: "POST",
        body: JSON.stringify(appointmentData),
      });

      if (appointmentRes.ok) {
        alert("Appointment Booked Successfully!");
        appointmentForm.reset();
        loadAppointmentDropdowns(); // Dropdowns යාවත්කාලීන කිරීම
      } else {
        alert("Failed to book appointment. Please try again.");
      }
    } catch (error) {
      console.error("Error during appointment booking:", error);
      alert("An error occurred. Check the console for details.");
    }
  });
}
