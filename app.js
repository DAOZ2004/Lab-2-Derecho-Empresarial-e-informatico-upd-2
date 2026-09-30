const form = document.querySelector("#calculator");
const formError = document.querySelector("#form-error");
const noExtras = document.querySelector("#no-extras");
const extrasGrid = document.querySelector(".extras-grid");
const extrasFields = document.querySelector("#extras-fields");
const extrasLockedNote = document.querySelector("#extras-locked-note");
const resignationDetails = document.querySelector("#resignation-details");
const resignationNotice = document.querySelector("#resignation-notice");
const statusLabel = document.querySelector("#result-status");
const calculationNote = document.querySelector("#calculation-note");
const numberValue = (name) => Number(new FormData(form).get(name) || 0);
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function countServiceDays() {
  const years = numberValue("years");
  const months = numberValue("months");
  const extraDays = numberValue("extra-days");
  return years * 360 + months * 30 + extraDays;
}

function updateResignationFields() {
  const cause = form.querySelector('input[name="cause"]:checked').value;
  const isResignation = cause === "resignation";
  resignationDetails.hidden = !isResignation;
  resignationDetails.disabled = !isResignation;
  document.querySelector("#indemnity-row").hidden = !isResignation;

  const employeeType = form.querySelector('input[name="employee-type"]:checked')?.value;
  if (!employeeType) {
    resignationNotice.textContent = "Selecciona el tipo de empleado para consultar el aviso previo aplicable.";
  } else {
    const noticeDays = employeeType === "head" ? 30 : 15;
    const employeeDescription = employeeType === "head" ? "el personal de jefatura" : "el personal común";
    resignationNotice.textContent = `Según la normativa salvadoreña sobre renuncia voluntaria, ${employeeDescription} debe avisar al patrono con al menos ${noticeDays} días de anticipación para tener derecho a indemnización.`;
  }

  const compliance = form.querySelector('input[name="resignation-compliance"]:checked')?.value;
  const lockExtras = isResignation && compliance === "no";
  extrasFields.disabled = lockExtras || noExtras.checked;
  noExtras.disabled = lockExtras;
  extrasGrid.classList.toggle("is-disabled", lockExtras || noExtras.checked);
  extrasLockedNote.hidden = !lockExtras;
  document.querySelector("#special-days-section").classList.toggle("is-locked", lockExtras);
}

function calculate() {
  const salary = numberValue("salary");
  const serviceDays = countServiceDays();
  const minimumWage = numberValue("minimum-wage");
  const dailySalary = salary / 30;
  const serviceYears = serviceDays / 360;
  const cause = new FormData(form).get("cause");
  const resignationCompliance = new FormData(form).get("resignation-compliance");
  let indemnity = 0;

  if (cause === "resignation" && resignationCompliance === "yes" && serviceYears >= 2) {
    const remainder = serviceDays % 360;
    const resignationYears = Math.floor(serviceDays / 360) + (remainder >= 180 ? remainder / 360 : 0);
    indemnity = Math.min(salary, minimumWage * 2) / 2 * resignationYears;
  }

  const extrasUnavailable = noExtras.checked || (cause === "resignation" && resignationCompliance === "no");
  const dayHours = extrasUnavailable ? 0 : numberValue("day-hours");
  const nightHours = extrasUnavailable ? 0 : numberValue("night-hours");
  const holidayDays = extrasUnavailable ? 0 : numberValue("holiday-days");
  const restDays = extrasUnavailable ? 0 : numberValue("rest-days");
  const hourlySalary = dailySalary / 8;
  const results = {
    indemnity,
    dayOvertime: dayHours * hourlySalary * 2,
    nightOvertime: nightHours * hourlySalary * 2 * 1.25,
    holiday: holidayDays * dailySalary,
    rest: restDays * dailySalary * 1.5
  };
  for (const key of Object.keys(results)) {
    results[key] = Math.round((results[key] + Number.EPSILON) * 100) / 100;
  }
  results.total = Object.values(results).reduce((sum, value) => sum + value, 0);

  for (const [key, amount] of Object.entries(results)) {
    document.querySelector(`[data-result="${key}"]`).textContent = money.format(amount);
  }
  statusLabel.textContent = "CÁLCULO ACTUALIZADO";

  calculationNote.textContent = `Bases usadas: salario diario = salario mensual / 30; salario por hora diurna = salario diario / 8. La compensación por renuncia requiere marcar Sí, al menos 2 años y considera fracciones superiores a 6 meses. Asueto = salario diario adicional; descanso semanal = 1.5 salarios diarios. Montos brutos, sin deducciones.`;
}

function validateForm() {
  const requiredFields = [...form.querySelectorAll("input[required]")];
  const invalid = requiredFields.find((field) => !field.checkValidity());
  const months = numberValue("months");
  const extraDays = numberValue("extra-days");
  const numericFields = [...form.querySelectorAll('input[type="number"]')];
  const invalidNumber = numericFields.find((field) => field.value !== "" && (!Number.isFinite(Number(field.value)) || Number(field.value) < 0));
  const cause = form.querySelector('input[name="cause"]:checked').value;
  const employeeType = form.querySelector('input[name="employee-type"]:checked');
  const jobTitle = form.elements["job-title"];
  const complianceSelected = form.querySelector('input[name="resignation-compliance"]:checked');

  if (cause === "resignation" && (!employeeType || !jobTitle.value.trim() || !complianceSelected)) {
    formError.textContent = "Selecciona el tipo de empleado, indica el cargo y responde Sí o No sobre las condiciones legales.";
    const missingField = !employeeType
      ? form.querySelector('input[name="employee-type"]')
      : !jobTitle.value.trim()
        ? jobTitle
        : form.querySelector('input[name="resignation-compliance"]');
    missingField.focus();
    return false;
  }

  if (invalid || invalidNumber || months > 11 || extraDays > 29) {
    formError.textContent = "Revisa los datos: deben ser valores válidos y no negativos; los meses van de 0 a 11 y los días de 0 a 29.";
    (invalid || invalidNumber || form.elements.months).focus();
    return false;
  }
  formError.textContent = "";
  return true;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (validateForm()) calculate();
});

form.addEventListener("input", () => {
  if (statusLabel.textContent === "CÁLCULO ACTUALIZADO" && validateForm()) calculate();
});

form.querySelectorAll('input[name="cause"]').forEach((input) => {
  input.addEventListener("change", () => {
    updateResignationFields();
    if (statusLabel.textContent === "CÁLCULO ACTUALIZADO" && validateForm()) calculate();
  });
});

form.querySelectorAll('input[name="employee-type"], input[name="resignation-compliance"]').forEach((input) => {
  input.addEventListener("change", () => {
    updateResignationFields();
    if (statusLabel.textContent === "CÁLCULO ACTUALIZADO" && validateForm()) calculate();
  });
});

noExtras.addEventListener("change", () => {
  updateResignationFields();
  if (statusLabel.textContent === "CÁLCULO ACTUALIZADO" && validateForm()) calculate();
});

document.querySelector("#print-button").addEventListener("click", () => window.print());

updateResignationFields();
if (validateForm()) calculate();