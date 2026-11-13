/**
 * RFC 4180 compliant CSV parser
 * Handles commas, quoted values, double-quote escaping, and CRLF / LF line endings.
 */
function parseCSV(text) {
    if (!text || typeof text !== "string") {
        return [];
    }

    // Strip UTF-8 BOM if present
    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
    }

    // Normalize all line breaks to standard \n
    const cleanText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    const rows = [];
    let currentRow = [];
    let insideQuotes = false;
    let currentCell = "";

    for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];
        const nextChar = cleanText[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                currentCell += '"';
                i++; // Skip escaped quote
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === "," && !insideQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = "";
        } else if (char === "\n" && !insideQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = "";

            // Push non-empty rows
            const hasData = currentRow.some(c => c && c.trim() !== "");
            if (hasData) {
                rows.push(currentRow);
            }
            currentRow = [];
        } else {
            currentCell += char;
        }
    }

    // Push last cell & row if content remains
    if (currentCell !== "" || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        const hasData = currentRow.some(c => c && c.trim() !== "");
        if (hasData) {
            rows.push(currentRow);
        }
    }

    return rows;
}

const ALLOWED_VEHICLE_CLASSES = [
    "Car",
    "Bus",
    "Motorcycle",
    "Truck",
    "Auto Rickshaw",
    "Bicycle"
];

const normalizeVehicle = (v) => {
    if (!v) return "";
    return v.toLowerCase().replace(/[-\s_]/g, "");
};

const normalizeHeader = (h) => {
    if (!h) return "";
    return h.toLowerCase().trim().replace(/^"|"$/g, "").replace(/\s+/g, "").replace(/_/g, "");
};

// Timestamp format HH:MM:SS or H:MM:SS (00:00:00 to 23:59:59)
const TIME_REGEX = /^(?:0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?(?:\.\d+)?$/;

/**
 * Validates parsed CSV lines.
 * Returns { isValid, errors, parsedRecords, totalRows }
 */
function validateCSVData(rows) {
    const errors = [];

    if (!rows || rows.length === 0) {
        return {
            isValid: false,
            errors: ["The CSV file is completely empty."],
            parsedRecords: [],
            totalRows: 0
        };
    }

    // 1. Validate Header (Row 1)
    const rawHeaders = rows[0].map(h => (h || "").trim().replace(/^"|"$/g, ""));
    const normalizedHeaders = rawHeaders.map(normalizeHeader);

    const hasTime = normalizedHeaders.some(h => h === "time" || h.includes("time"));
    const hasVehicle = normalizedHeaders.some(h => h.includes("vehicle") || h.includes("class"));
    const hasX = normalizedHeaders.some(h => h.startsWith("x"));
    const hasY = normalizedHeaders.some(h => h.startsWith("y"));

    if (!hasTime || !hasVehicle || !hasX || !hasY) {
        errors.push(
            `Row 1 (Header): Invalid CSV columns. Expected columns: time, vehicle_class, x(px), y(px). Received: ${rawHeaders.join(", ")}`
        );
        return {
            isValid: false,
            errors,
            parsedRecords: [],
            totalRows: 0
        };
    }

    // Map column indices dynamically
    const timeIdx = normalizedHeaders.findIndex(h => h === "time" || h.includes("time"));
    const vehicleIdx = normalizedHeaders.findIndex(h => h.includes("vehicle") || h.includes("class"));
    const xIdx = normalizedHeaders.findIndex(h => h.startsWith("x"));
    const yIdx = normalizedHeaders.findIndex(h => h.startsWith("y"));

    if (rows.length === 1) {
        errors.push("The CSV file contains only the header row and has no data records.");
        return {
            isValid: false,
            errors,
            parsedRecords: [],
            totalRows: 0
        };
    }

    const parsedRecords = [];
    const dataRows = rows.slice(1);

    // 2. Validate Every Data Row
    dataRows.forEach((row, index) => {
        const rowNumber = index + 2; // Row 1 is header, data rows start at 2

        // Skip accidental completely blank lines at the end
        if (!row || row.length === 0 || row.every(c => !c || c.trim() === "")) {
            return;
        }

        if (row.length < 4) {
            errors.push(
                `Row ${rowNumber}: Incomplete row. Expected 4 columns, found only ${row.length}.`
            );
            return;
        }

        const rawTime = (row[timeIdx] || "").trim().replace(/^"|"$/g, "");
        const rawVehicle = (row[vehicleIdx] || "").trim().replace(/^"|"$/g, "");
        const rawX = (row[xIdx] || "").trim().replace(/^"|"$/g, "");
        const rawY = (row[yIdx] || "").trim().replace(/^"|"$/g, "");
        const rowErrors = [];

        // Check for missing values
        if (!rawTime) {
            rowErrors.push('Missing value for "time"');
        }
        if (!rawVehicle) {
            rowErrors.push('Missing value for "vehicle_class"');
        }
        if (!rawX) {
            rowErrors.push('Missing value for "x(px)"');
        }
        if (!rawY) {
            rowErrors.push('Missing value for "y(px)"');
        }

        // Validate timestamp format
        if (rawTime) {
            if (!TIME_REGEX.test(rawTime)) {
                rowErrors.push(
                    `Invalid timestamp "${rawTime}". Expected format is HH:MM:SS (e.g., 08:00:23)`
                );
            }
        }

        // Validate vehicle class
        let matchedClass = null;
        if (rawVehicle) {
            matchedClass = ALLOWED_VEHICLE_CLASSES.find(
                cls => normalizeVehicle(cls) === normalizeVehicle(rawVehicle)
            );

            if (!matchedClass) {
                rowErrors.push(
                    `Invalid vehicle class "${rawVehicle}". Allowed classes are: ${ALLOWED_VEHICLE_CLASSES.join(
                        ", "
                    )}`
                );
            }
        }

        // Validate x(px) coordinate
        let parsedX = null;
        if (rawX) {
            const cleanX = rawX.replace(/px$/i, "").trim();
            const numX = Number(cleanX);
            if (isNaN(numX) || numX < 0) {
                rowErrors.push(
                    `Invalid horizontal coordinate x(px) "${rawX}". Must be a non-negative number.`
                );
            } else {
                parsedX = numX;
            }
        }

        // Validate y(px) coordinate
        let parsedY = null;
        if (rawY) {
            const cleanY = rawY.replace(/px$/i, "").trim();
            const numY = Number(cleanY);
            if (isNaN(numY) || numY < 0) {
                rowErrors.push(
                    `Invalid vertical coordinate y(px) "${rawY}". Must be a non-negative number.`
                );
            } else {
                parsedY = numY;
            }
        }

        if (rowErrors.length > 0) {
            errors.push(`Row ${rowNumber}: ${rowErrors.join("; ")}.`);
        } else {
            parsedRecords.push({
                time: rawTime,
                vehicle_class: matchedClass || rawVehicle,
                x: parsedX,
                y: parsedY,
                rowNumber
            });
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        parsedRecords: errors.length === 0 ? parsedRecords : [],
        totalRows: dataRows.length
    };
}

module.exports = {
    parseCSV,
    validateCSVData,
    ALLOWED_VEHICLE_CLASSES
};
