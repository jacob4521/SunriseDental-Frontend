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
    loadAppointmentsTable(); // <--- මේ පේළිය අලුතින් එකතු කරන්න
  }

  if (sectionId === "patients-section") {
    loadPatientsTable();
  }

  // අලුත් කොටස: Invoices පිටුවට යද්දී Table එක Load කරන්න
  if (sectionId === "invoices-section") {
    loadInvoiceAppointmentsTable();
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
        loadAppointmentsTable();
      } else {
        alert("Failed to book appointment. Please try again.");
      }
    } catch (error) {
      console.error("Error during appointment booking:", error);
      alert("An error occurred. Check the console for details.");
    }
  });
}

// --- 10. Load and Display Appointments Table ---
async function loadAppointmentsTable() {
  try {
    const tbody = document.getElementById("appointments-table-body");
    tbody.innerHTML =
      '<tr><td colspan="6" style="padding: 10px; text-align: center;">Loading appointments...</td></tr>';

    // API 4කින්ම එකවර දත්ත ලබා ගැනීම (Parallel fetching for efficiency)
    const [appRes, patRes, denRes, trtRes] = await Promise.all([
      fetchWithAuth("/appointments"),
      fetchWithAuth("/patients"),
      fetchWithAuth("/dentists"),
      fetchWithAuth("/treatments"),
    ]);

    if (appRes.ok && patRes.ok && denRes.ok && trtRes.ok) {
      const appointments = await appRes.json();
      const patients = await patRes.json();
      const dentists = await denRes.json();
      const treatments = await trtRes.json();

      tbody.innerHTML = ""; // Clear loading text

      if (appointments.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="6" style="padding: 10px; text-align: center;">No appointments found.</td></tr>';
        return;
      }

      // දත්ත Map කර Table එකට ඇතුළත් කිරීම
      appointments.forEach((app) => {
        // ID එකට අදාළ නම සොයාගැනීම
        const patient = patients.find((p) => p.patientId === app.patientId);
        const dentist = dentists.find((d) => d.dentistId === app.dentistId);
        const treatment = treatments.find(
          (t) => t.treatmentId === app.treatmentId,
        );

        const patientName = patient ? patient.patientName : "Unknown";
        const dentistName = dentist ? dentist.dentistName : "Unknown";
        const treatmentName = treatment ? treatment.treatmentType : "Unknown";

        const row = `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">${app.appointmentId}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${patientName}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${dentistName}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${treatmentName}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${app.appointmentDate}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${app.appointmentTime}</td>
                  </tr>
                `;
        tbody.innerHTML += row;
      });
    } else {
      tbody.innerHTML =
        '<tr><td colspan="6" style="padding: 10px; text-align: center; color: red;">Failed to load data.</td></tr>';
    }
  } catch (error) {
    console.error("Error loading appointments table:", error);
  }
}

// --- 11. Load and Display Patients Table ---
async function loadPatientsTable() {
  try {
    const tbody = document.getElementById("patients-table-body");
    tbody.innerHTML =
      '<tr><td colspan="5" style="padding: 10px; text-align: center;">Loading patients...</td></tr>';

    const response = await fetchWithAuth("/patients");
    if (response.ok) {
      const patients = await response.json();
      tbody.innerHTML = "";

      if (patients.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="5" style="padding: 10px; text-align: center;">No patients found.</td></tr>';
        return;
      }

      patients.forEach((p) => {
        const row = `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">${p.patientId}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${p.patientName}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${p.contactNumber}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${p.address}</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                        <button class="admin-only" onclick="deletePatient(${p.patientId})" style="background-color: #e74c3c; padding: 5px 10px; font-size: 12px; width: auto;">Delete</button>
                    </td>
                  </tr>
                `;
        tbody.innerHTML += row;
      });

      // වැදගත්: අලුතින් හැදුණු Delete බොත්තම් වලටත් RBAC (Admin only) නීතිය අදාළ කිරීම
      applyRoleBasedAccess();
    } else {
      tbody.innerHTML =
        '<tr><td colspan="5" style="padding: 10px; text-align: center; color: red;">Failed to load patients.</td></tr>';
    }
  } catch (error) {
    console.error("Error loading patients:", error);
  }
}

// --- 12. Add New Patient (Directly from Patients Section) ---
const addPatientForm = document.getElementById("add-patient-form");
if (addPatientForm) {
  addPatientForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const patientName = document.getElementById("new-pat-name").value;
    const contactNumber = document.getElementById("new-pat-contact").value;
    const address = document.getElementById("new-pat-address").value;

    const patientData = { patientName, contactNumber, address };

    try {
      const response = await fetchWithAuth("/patients", {
        method: "POST",
        body: JSON.stringify(patientData),
      });

      if (response.ok) {
        alert("Patient added successfully!");
        addPatientForm.reset();
        loadPatientsTable(); // Table එක Refresh කිරීම
      } else {
        alert("Failed to add patient. Contact number might already exist.");
      }
    } catch (error) {
      console.error("Error adding patient:", error);
    }
  });
}

// --- 13. Delete Patient ---
async function deletePatient(patientId) {
  if (!confirm("Are you sure you want to delete this patient?")) {
    return;
  }

  try {
    const response = await fetchWithAuth(`/patients/${patientId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      alert("Patient deleted successfully!");
      loadPatientsTable(); // Table එක Refresh කිරීම
    } else {
      if (response.status === 403) {
        alert("Access Denied: Only Admins can delete patients.");
      } else {
        alert(
          "Failed to delete patient. They might have existing appointments.",
        );
      }
    }
  } catch (error) {
    console.error("Error deleting patient:", error);
  }
}


// --- 14. Load Appointments for Invoice Section ---
async function loadInvoiceAppointmentsTable() {
    try {
        const tbody = document.getElementById('invoice-appointments-table-body');
        tbody.innerHTML = '<tr><td colspan="4" style="padding: 10px; text-align: center;">Loading appointments...</td></tr>';

        // දත්ත 4ම එකවර ලබා ගැනීම (බිල්පතට සියලු විස්තර අවශ්‍ය නිසා)
        const [appRes, patRes, denRes, trtRes] = await Promise.all([
            fetchWithAuth('/appointments'),
            fetchWithAuth('/patients'),
            fetchWithAuth('/dentists'),
            fetchWithAuth('/treatments')
        ]);

        if (appRes.ok && patRes.ok && denRes.ok && trtRes.ok) {
            const appointments = await appRes.json();
            const patients = await patRes.json();
            const dentists = await denRes.json();
            const treatments = await trtRes.json();

            tbody.innerHTML = '';

            if (appointments.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="padding: 10px; text-align: center;">No appointments found.</td></tr>';
                return;
            }

            appointments.forEach(app => {
                const patient = patients.find(p => p.patientId === app.patientId);
                const dentist = dentists.find(d => d.dentistId === app.dentistId);
                const treatment = treatments.find(t => t.treatmentId === app.treatmentId);

                const patientName = patient ? patient.patientName : 'Unknown';
                const dentistName = dentist ? dentist.dentistName : 'Unknown';
                const treatmentName = treatment ? treatment.treatmentType : 'Unknown';
                const treatmentPrice = treatment ? treatment.price : 0;

                // String values වල තියෙන single quotes escape කිරීම (Error එකක් නොඒමට)
                const safePatient = patientName.replace(/'/g, "\\'");
                const safeDentist = dentistName.replace(/'/g, "\\'");
                const safeTreatment = treatmentName.replace(/'/g, "\\'");

                const row = `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">${app.appointmentId}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${patientName}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${app.appointmentDate}</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                        <button onclick="showQuickInvoiceForm(${app.appointmentId}, '${safePatient}', '${safeDentist}', '${safeTreatment}', ${treatmentPrice})" style="background-color: #3498db; padding: 5px 10px; font-size: 12px; width: auto;">Generate Bill</button>
                    </td>
                  </tr>
                `;
                tbody.innerHTML += row;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="padding: 10px; text-align: center; color: red;">Failed to load data.</td></tr>';
        }
    } catch (error) {
        console.error("Error loading invoice appointments:", error);
    }
}

// --- 15. Show Quick Invoice Form (Auto-Calculate Price) ---
function showQuickInvoiceForm(appointmentId, patientName, dentistName, treatmentName, treatmentPrice) {
    // 1. ස්ථාවර සායන ගාස්තුව (ඔයාට අවශ්‍ය නම් මෙය වෙනස් කළ හැක)
    const fixedCenterCharge = 1500.00; 
    const totalAmount = treatmentPrice + fixedCenterCharge;

    document.getElementById('invoice-app-id').value = appointmentId;
    document.getElementById('display-app-id').textContent = appointmentId;
    
    // Form එකේ dataset එකට අමතර දත්ත ටික තාවකාලිකව save කිරීම (Print කරද්දී ගන්න)
    const form = document.getElementById('generate-invoice-form');
    form.dataset.patientName = patientName;
    form.dataset.dentistName = dentistName;
    form.dataset.treatmentName = treatmentName;
    form.dataset.treatmentPrice = treatmentPrice;
    form.dataset.centerCharge = fixedCenterCharge;

    // Auto-calculate කරපු මුදල පෙන්නනවා, ඒ වගේම වෙනස් කරන්න බැරි වෙන්න ReadOnly කරනවා
    const amountInput = document.getElementById('invoice-amount');
    amountInput.value = totalAmount.toFixed(2);
    amountInput.readOnly = true; 
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoice-date').value = today;
    
    document.getElementById('quick-invoice-form-container').style.display = 'block';
}

// --- 16. Submit Invoice and Print ---
const generateInvoiceForm = document.getElementById('generate-invoice-form');
if (generateInvoiceForm) {
    generateInvoiceForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const appointmentId = document.getElementById('invoice-app-id').value;
        const totalAmount = parseFloat(document.getElementById('invoice-amount').value);
        const issuedDate = document.getElementById('invoice-date').value;
        const paymentStatus = document.getElementById('invoice-status').value;

        // Backend එකට යවන දත්ත
        const invoiceData = {
            appointmentId: parseInt(appointmentId),
            totalAmount: totalAmount,
            issuedDate: issuedDate,
            paymentStatus: paymentStatus
        };

        try {
            const response = await fetchWithAuth('/invoices', {
                method: 'POST',
                body: JSON.stringify(invoiceData)
            });

            if (response.ok) {
                alert('Invoice Created Successfully!');
                document.getElementById('quick-invoice-form-container').style.display = 'none';
                
                // Form dataset එකෙන් අමතර දත්ත ටික අරගන්නවා
                const pName = generateInvoiceForm.dataset.patientName;
                const dName = generateInvoiceForm.dataset.dentistName;
                const tName = generateInvoiceForm.dataset.treatmentName;
                const tPrice = parseFloat(generateInvoiceForm.dataset.treatmentPrice);
                const cCharge = parseFloat(generateInvoiceForm.dataset.centerCharge);

                generateInvoiceForm.reset();

                // Print function එකට සියලුම දත්ත යැවීම
                printInvoice(appointmentId, issuedDate, paymentStatus, pName, dName, tName, tPrice, cCharge, totalAmount);
            } else {
                const errData = await response.json();
                alert(`Failed to create invoice: ${errData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error generating invoice:', error);
        }
    });
}

// --- 17. Print Invoice Logic (Complete Breakdown) ---
function printInvoice(appointmentId, date, status, patientName, dentistName, treatmentName, treatmentPrice, centerCharge, totalAmount) {
    const printWindow = window.open('', '_blank', 'width=700,height=500');
    
    const htmlContent = `
        <html>
        <head>
            <title>Invoice - Sunrise Dental Clinic</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #333; }
                .invoice-container { max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                .header { text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 15px; margin-bottom: 20px; }
                .clinic-name { font-size: 26px; font-weight: bold; color: #2c3e50; margin-bottom: 5px; }
                .info-section { display: flex; justify-content: space-between; margin-bottom: 20px; }
                .info-section div { line-height: 1.6; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border-bottom: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background-color: #f8f9fa; color: #2c3e50; }
                .total-row { font-weight: bold; font-size: 18px; color: #e74c3c; }
                .footer { text-align: center; margin-top: 30px; font-size: 13px; color: #7f8c8d; border-top: 1px solid #ddd; padding-top: 15px; }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <div class="header">
                    <div class="clinic-name">Sunrise Dental Clinic</div>
                    <div>Official Medical Invoice</div>
                </div>
                
                <div class="info-section">
                    <div>
                        <strong>Patient:</strong> ${patientName}<br>
                        <strong>Dentist:</strong> Dr. ${dentistName}
                    </div>
                    <div style="text-align: right;">
                        <strong>Invoice No:</strong> #APP-${appointmentId}<br>
                        <strong>Date:</strong> ${date}<br>
                        <strong>Status:</strong> ${status}
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th style="text-align: right;">Amount (Rs.)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Treatment: ${treatmentName}</td>
                            <td style="text-align: right;">${treatmentPrice.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>Dental Center Charge (Fixed)</td>
                            <td style="text-align: right;">${centerCharge.toFixed(2)}</td>
                        </tr>
                        <tr class="total-row">
                            <td style="text-align: right; padding-top: 15px;">Grand Total:</td>
                            <td style="text-align: right; padding-top: 15px;">Rs. ${totalAmount.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="footer">
                    Thank you for choosing Sunrise Dental Clinic!<br>
                    Payment is required at the time of service.
                </div>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
}