/* ============================================================
   storage.js — single source of truth for reading/writing
   EVS report data in localStorage.
   ============================================================ */

const EVS_STORAGE_KEY = "evs_reports";

/**
 * Returns every report currently stored, seeding with the
 * bundled sample dataset on first run.
 */
function getAllReports() {
  try {
    const raw = localStorage.getItem(EVS_STORAGE_KEY);

    if (raw === null) {
      const seeded = typeof EVS_SAMPLE_DATA !== "undefined" ? EVS_SAMPLE_DATA : [];
      localStorage.setItem(EVS_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("EVS storage: failed to read reports, returning empty list.", err);
    return [];
  }
}

/**
 * Appends a single new report to the stored list and persists it.
 */
function saveReport(report) {
  if (!report || typeof report !== "object") {
    console.error("EVS storage: saveReport() called with an invalid report.", report);
    return false;
  }

  // Ensure ID and timestamp exist
  if (!report.id) {
    report.id = "rep-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  }
  if (!report.timestamp) {
    report.timestamp = new Date().toISOString();
  }

  const reports = getAllReports();
  reports.unshift(report); // place newest at beginning

  try {
    localStorage.setItem(EVS_STORAGE_KEY, JSON.stringify(reports));
    return true;
  } catch (err) {
    console.error("EVS storage: failed to save report.", err);
    return false;
  }
}

/**
 * Overwrites the entire stored list in one go.
 */
function saveAllReports(reports) {
  if (!Array.isArray(reports)) {
    console.error("EVS storage: saveAllReports() expects an array.", reports);
    return false;
  }
  try {
    localStorage.setItem(EVS_STORAGE_KEY, JSON.stringify(reports));
    return true;
  } catch (err) {
    console.error("EVS storage: failed to save reports.", err);
    return false;
  }
}

/**
 * Computes high-level statistics across all stored reports.
 */
function getReportStats() {
  const reports = getAllReports();
  const stats = {
    total: reports.length,
    tree: 0,
    water: 0,
    alerts: 0,
  };

  reports.forEach((r) => {
    if (r.category === "tree") stats.tree++;
    if (r.category === "water") stats.water++;
    if (typeof EVS_ALERT_SUBTYPES !== "undefined" && EVS_ALERT_SUBTYPES.has(r.subtype)) {
      stats.alerts++;
    }
  });

  return stats;
}

/**
 * Resets storage to the default sample dataset.
 */
function resetToSampleData() {
  try {
    localStorage.removeItem(EVS_STORAGE_KEY);
    const seeded = typeof EVS_SAMPLE_DATA !== "undefined" ? EVS_SAMPLE_DATA : [];
    localStorage.setItem(EVS_STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  } catch (err) {
    console.error("EVS storage: failed to reset sample data.", err);
    return [];
  }
}
