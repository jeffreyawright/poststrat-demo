/**
 * Census Variable Recoding Helpers
 *
 * CRITICAL: These recode specs MUST match the survey recoding in Module 11
 * exactly, or MRP predictions will be invalid.
 */

/**
 * Demographic category specifications
 * These MUST match ANES/CES survey conventions
 */
const RECODE_SPECS = {
  ageGroup: {
    levels: ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
    description: "6-category age grouping following ANES convention"
  },

  sex: {
    levels: ["Female", "Male"],
    numericCoding: { Female: 0, Male: 1 },  // For modeling
    description: "Binary sex for modeling purposes"
  },

  raceEth: {
    levels: ["White", "Black", "Hispanic", "Asian", "Other"],
    description: "5-category race/ethnicity, Hispanic origin prioritized"
  },

  education: {
    levels: ["Less Than HS", "High School", "Some College", "BA/BS", "Post-Grad"],
    description: "5-category educational attainment"
  },

  censusRegion: {
    levels: ["Northeast", "Midwest", "South", "West", "DC"],
    mapping: {
      Northeast: ["CT", "ME", "MA", "NH", "RI", "VT", "NJ", "NY", "PA"],
      Midwest: ["IL", "IN", "MI", "OH", "WI", "IA", "KS", "MN", "MO", "NE", "ND", "SD"],
      South: ["DE", "FL", "GA", "MD", "NC", "SC", "VA", "WV", "AL", "KY", "MS", "TN", "AR", "LA", "OK", "TX"],
      West: ["AZ", "CO", "ID", "MT", "NV", "NM", "UT", "WY", "AK", "CA", "HI", "OR", "WA"],
      DC: ["DC"]
    },
    description: "Census regions with DC as separate category"
  }
};

/**
 * Recode Census age variables to 6-category age groups
 * Mapping provided by user based on ANES convention
 *
 * @param {Object} row - Census data row with B01001 variables
 * @param {string} sex - "Male" or "Female"
 * @returns {Object} Age group counts { "18-24": count, "25-34": count, ... }
 */
function recodeAge(row, sex) {
  // Helper to safely parse Census values
  const getValue = (key) => parseInt(row[key] || 0, 10);

  // Census B01001 codes:
  // Male: _007E to _025E (18-19 through 85+)
  // Female: _031E to _049E (18-19 through 85+)
  const offset = sex === "Male" ? 0 : 24;  // Female codes are +24 from male

  // Age bucket mapping from user's specification:
  // 18-24: includes 18-19, 20, 21, 22-24
  // 25-34: includes 25-29, 30-34
  // 35-44: includes 35-39, 40-44
  // 45-54: includes 45-49, 50-54
  // 55-64: includes 55-59, 60-64 (60-61, 62-64)
  // 65+: includes 65-66, 67-69, 70-74, 75-79, 80-84, 85+

  return {
    "18-24":
      getValue(`B01001_${String(7 + offset).padStart(3, '0')}E`) +  // 18-19
      getValue(`B01001_${String(8 + offset).padStart(3, '0')}E`) +  // 20
      getValue(`B01001_${String(9 + offset).padStart(3, '0')}E`) +  // 21
      getValue(`B01001_${String(10 + offset).padStart(3, '0')}E`),  // 22-24
    "25-34":
      getValue(`B01001_${String(11 + offset).padStart(3, '0')}E`) + // 25-29
      getValue(`B01001_${String(12 + offset).padStart(3, '0')}E`),  // 30-34
    "35-44":
      getValue(`B01001_${String(13 + offset).padStart(3, '0')}E`) + // 35-39
      getValue(`B01001_${String(14 + offset).padStart(3, '0')}E`),  // 40-44
    "45-54":
      getValue(`B01001_${String(15 + offset).padStart(3, '0')}E`) + // 45-49
      getValue(`B01001_${String(16 + offset).padStart(3, '0')}E`),  // 50-54
    "55-64":
      getValue(`B01001_${String(17 + offset).padStart(3, '0')}E`) + // 55-59
      getValue(`B01001_${String(18 + offset).padStart(3, '0')}E`) + // 60-61
      getValue(`B01001_${String(19 + offset).padStart(3, '0')}E`),  // 62-64
    "65+":
      getValue(`B01001_${String(20 + offset).padStart(3, '0')}E`) + // 65-66
      getValue(`B01001_${String(21 + offset).padStart(3, '0')}E`) + // 67-69
      getValue(`B01001_${String(22 + offset).padStart(3, '0')}E`) + // 70-74
      getValue(`B01001_${String(23 + offset).padStart(3, '0')}E`) + // 75-79
      getValue(`B01001_${String(24 + offset).padStart(3, '0')}E`) + // 80-84
      getValue(`B01001_${String(25 + offset).padStart(3, '0')}E`)   // 85+
  };
}

/**
 * Recode Census race/ethnicity variables to 5-category system
 * Hispanic origin is prioritized over race
 *
 * @param {Object} row - Census data row with B03002 variables
 * @returns {Object} Race counts { "White": count, "Black": count, ... }
 */
function recodeRace(row) {
  const getValue = (key) => parseInt(row[key] || 0, 10);

  return {
    "White": getValue('B03002_003E'),      // White alone, not Hispanic
    "Black": getValue('B03002_004E'),      // Black alone, not Hispanic
    "Hispanic": getValue('B03002_012E'),   // Hispanic or Latino (any race)
    "Asian": getValue('B03002_006E'),      // Asian alone, not Hispanic
    "Other":
      getValue('B03002_005E') +            // American Indian/Alaska Native
      getValue('B03002_007E') +            // Native Hawaiian/Pacific Islander
      getValue('B03002_008E') +            // Some other race alone
      getValue('B03002_009E')              // Two or more races
  };
}

/**
 * Recode Census education variables to 5-category system
 * Based on B15003 (population 25+ years)
 *
 * @param {Object} row - Census data row with B15003 variables
 * @returns {Object} Education counts { "Less Than HS": count, ... }
 */
function recodeEducation(row) {
  const getValue = (key) => parseInt(row[key] || 0, 10);

  return {
    "Less Than HS":
      getValue('B15003_002E') +  // No schooling
      getValue('B15003_003E') +  // Nursery
      getValue('B15003_004E') +  // Kindergarten
      getValue('B15003_005E') +  // 1st grade
      getValue('B15003_006E') +  // 2nd grade
      getValue('B15003_007E') +  // 3rd grade
      getValue('B15003_008E') +  // 4th grade
      getValue('B15003_009E') +  // 5th grade
      getValue('B15003_010E') +  // 6th grade
      getValue('B15003_011E') +  // 7th grade
      getValue('B15003_012E') +  // 8th grade
      getValue('B15003_013E') +  // 9th grade
      getValue('B15003_014E') +  // 10th grade
      getValue('B15003_015E') +  // 11th grade
      getValue('B15003_016E'),   // 12th grade, no diploma

    "High School":
      getValue('B15003_017E') +  // HS diploma
      getValue('B15003_018E'),   // GED or alternative

    "Some College":
      getValue('B15003_019E') +  // Some college, < 1 year
      getValue('B15003_020E') +  // Some college, >= 1 year
      getValue('B15003_021E'),   // Associate's degree

    "BA/BS":
      getValue('B15003_022E'),   // Bachelor's degree

    "Post-Grad":
      getValue('B15003_023E') +  // Master's degree
      getValue('B15003_024E') +  // Professional degree
      getValue('B15003_025E')    // Doctorate
  };
}

/**
 * Map state code to Census region
 *
 * @param {string} stateCode - Two-letter state code (e.g., "TX")
 * @returns {string} Census region ("Northeast", "Midwest", "South", "West", "DC")
 */
function getRegion(stateCode) {
  for (const [region, states] of Object.entries(RECODE_SPECS.censusRegion.mapping)) {
    if (states.includes(stateCode)) {
      return region;
    }
  }
  throw new Error(`Unknown state code: ${stateCode}`);
}

/**
 * State FIPS code to two-letter abbreviation mapping
 * (Subset - add more as needed)
 */
const FIPS_TO_STATE = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
  '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
  '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
  '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY', '72': 'PR'
};

/**
 * Convert FIPS code to state abbreviation
 *
 * @param {string} fips - FIPS state code (e.g., "48")
 * @returns {string} State abbreviation (e.g., "TX")
 */
function fipsToState(fips) {
  const state = FIPS_TO_STATE[fips];
  if (!state) {
    throw new Error(`Unknown FIPS code: ${fips}`);
  }
  return state;
}

/**
 * Parse Congressional District from Census row
 *
 * @param {Object} row - Census data row
 * @returns {Object} { state: "TX", cd: "TX-32", cdNumber: "32" }
 */
function parseDistrict(row) {
  const stateFips = row.state;
  const cdNumber = row['congressional district'];
  const state = fipsToState(stateFips);

  // Handle at-large districts (code "00")
  const cdFormatted = cdNumber === '00' ? '00' : cdNumber;

  return {
    state,
    cd: `${state}-${cdFormatted}`,
    cdNumber: cdFormatted
  };
}

module.exports = {
  RECODE_SPECS,
  recodeAge,
  recodeRace,
  recodeEducation,
  getRegion,
  fipsToState,
  parseDistrict
};
