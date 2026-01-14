/**
 * Census API Client
 *
 * Fetches ACS 1-year data at Congressional District level.
 * Required tables:
 * - B01001: Sex by Age
 * - B03002: Hispanic/Latino Origin by Race
 * - B15003: Educational Attainment
 */

const CENSUS_BASE_URL = 'https://api.census.gov/data';

/**
 * Census ACS 1-year variables needed for poststratification
 *
 * B01001: Sex by Age (detailed breakdown)
 * - B01001_001E: Total population
 * - B01001_003E to B01001_025E: Male by age groups
 * - B01001_027E to B01001_049E: Female by age groups
 *
 * B03002: Hispanic Origin by Race
 * - B03002_001E: Total
 * - B03002_003E: White alone, not Hispanic
 * - B03002_004E: Black alone, not Hispanic
 * - B03002_012E: Hispanic or Latino (any race)
 * - B03002_006E: Asian alone, not Hispanic
 * - Others collapsed to "Other"
 *
 * B15003: Educational Attainment (25+ years)
 * - B15003_001E: Total
 * - B15003_002E to B15003_016E: Less than HS
 * - B15003_017E to B15003_018E: HS diploma/GED
 * - B15003_019E to B15003_021E: Some college/Associate's
 * - B15003_022E: Bachelor's degree
 * - B15003_023E to B15003_025E: Graduate/Professional
 */

const CENSUS_VARIABLES = {
  // Total population
  total: ['B01001_001E'],

  // Sex by Age (18+ only, voting age population)
  // Male age groups
  male_18_19: ['B01001_007E'],
  male_20: ['B01001_008E'],
  male_21: ['B01001_009E'],
  male_22_24: ['B01001_010E'],
  male_25_29: ['B01001_011E'],
  male_30_34: ['B01001_012E'],
  male_35_39: ['B01001_013E'],
  male_40_44: ['B01001_014E'],
  male_45_49: ['B01001_015E'],
  male_50_54: ['B01001_016E'],
  male_55_59: ['B01001_017E'],
  male_60_61: ['B01001_018E'],
  male_62_64: ['B01001_019E'],
  male_65_66: ['B01001_020E'],
  male_67_69: ['B01001_021E'],
  male_70_74: ['B01001_022E'],
  male_75_79: ['B01001_023E'],
  male_80_84: ['B01001_024E'],
  male_85_plus: ['B01001_025E'],

  // Female age groups
  female_18_19: ['B01001_031E'],
  female_20: ['B01001_032E'],
  female_21: ['B01001_033E'],
  female_22_24: ['B01001_034E'],
  female_25_29: ['B01001_035E'],
  female_30_34: ['B01001_036E'],
  female_35_39: ['B01001_037E'],
  female_40_44: ['B01001_038E'],
  female_45_49: ['B01001_039E'],
  female_50_54: ['B01001_040E'],
  female_55_59: ['B01001_041E'],
  female_60_61: ['B01001_042E'],
  female_62_64: ['B01001_043E'],
  female_65_66: ['B01001_044E'],
  female_67_69: ['B01001_045E'],
  female_70_74: ['B01001_046E'],
  female_75_79: ['B01001_047E'],
  female_80_84: ['B01001_048E'],
  female_85_plus: ['B01001_049E'],

  // Race/Ethnicity (B03002)
  race_total: ['B03002_001E'],
  race_white_nh: ['B03002_003E'],  // White alone, not Hispanic
  race_black_nh: ['B03002_004E'],  // Black alone, not Hispanic
  race_asian_nh: ['B03002_006E'],  // Asian alone, not Hispanic
  race_hispanic: ['B03002_012E'],  // Hispanic or Latino (any race)
  race_aian_nh: ['B03002_005E'],   // American Indian/Alaska Native
  race_nhpi_nh: ['B03002_007E'],   // Native Hawaiian/Pacific Islander
  race_other_nh: ['B03002_008E'],  // Some other race alone
  race_two_plus_nh: ['B03002_009E'], // Two or more races

  // Education (B15003, 25+ years)
  edu_total: ['B15003_001E'],
  edu_none: ['B15003_002E'],
  edu_nursery: ['B15003_003E'],
  edu_kindergarten: ['B15003_004E'],
  edu_1st_grade: ['B15003_005E'],
  edu_2nd_grade: ['B15003_006E'],
  edu_3rd_grade: ['B15003_007E'],
  edu_4th_grade: ['B15003_008E'],
  edu_5th_grade: ['B15003_009E'],
  edu_6th_grade: ['B15003_010E'],
  edu_7th_grade: ['B15003_011E'],
  edu_8th_grade: ['B15003_012E'],
  edu_9th_grade: ['B15003_013E'],
  edu_10th_grade: ['B15003_014E'],
  edu_11th_grade: ['B15003_015E'],
  edu_12th_no_diploma: ['B15003_016E'],
  edu_hs_diploma: ['B15003_017E'],
  edu_ged: ['B15003_018E'],
  edu_some_college_less_1yr: ['B15003_019E'],
  edu_some_college_1yr: ['B15003_020E'],
  edu_associates: ['B15003_021E'],
  edu_bachelors: ['B15003_022E'],
  edu_masters: ['B15003_023E'],
  edu_professional: ['B15003_024E'],
  edu_doctorate: ['B15003_025E']
};

/**
 * Fetch ACS 1-year data for all congressional districts
 *
 * Census API has 50-variable limit, so we split into multiple requests
 *
 * @param {number} year - ACS year (e.g., 2024, 2023, 2022)
 * @returns {Promise<Array>} - Array of district data objects
 */
async function fetchACS1Year(year) {
  const apiKey = process.env.CENSUS_API_KEY;

  if (!apiKey) {
    throw new Error('CENSUS_API_KEY environment variable not set');
  }

  // Flatten all variables into a single array
  const allVariables = Object.values(CENSUS_VARIABLES).flat();

  // Census API limit is 50 variables per request
  // We need NAME, state, congressional district as geography fields (count as 1 "get" param)
  // So we can request ~45 variables per batch safely
  const MAX_VARS_PER_REQUEST = 45;

  console.log(`Fetching ACS ${year} 1-year data for congressional districts...`);
  console.log(`Total variables: ${allVariables.length}, will split into ${Math.ceil(allVariables.length / MAX_VARS_PER_REQUEST)} batches`);

  const batches = [];
  for (let i = 0; i < allVariables.length; i += MAX_VARS_PER_REQUEST) {
    batches.push(allVariables.slice(i, i + MAX_VARS_PER_REQUEST));
  }

  let mergedDistricts = null;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const variableString = batch.join(',');
    const getParams = `NAME,${variableString}`;

    const url = `${CENSUS_BASE_URL}/${year}/acs/acs1?get=${getParams}&for=congressional%20district:*&in=state:*&key=${apiKey}`;

    console.log(`Fetching batch ${batchIndex + 1}/${batches.length} (${batch.length} variables)...`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Census API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      // First row is headers
      const headers = data[0];
      const rows = data.slice(1);

      // Transform into array of objects
      const districts = rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      });

      // Merge with previous batches
      if (mergedDistricts === null) {
        mergedDistricts = districts;
      } else {
        // Merge by matching state + congressional district
        for (let i = 0; i < districts.length; i++) {
          const newDistrict = districts[i];
          const existingDistrict = mergedDistricts.find(
            d => d.state === newDistrict.state && d['congressional district'] === newDistrict['congressional district']
          );

          if (existingDistrict) {
            // Merge variables (skip NAME, state, congressional district)
            Object.keys(newDistrict).forEach(key => {
              if (key !== 'NAME' && key !== 'state' && key !== 'congressional district') {
                existingDistrict[key] = newDistrict[key];
              }
            });
          }
        }
      }

      console.log(`Batch ${batchIndex + 1} complete`);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error(`Census API batch ${batchIndex + 1} failed:`, error.message);
      throw error;
    }
  }

  console.log(`Fetched ${mergedDistricts.length} congressional districts with ${allVariables.length} variables`);
  return mergedDistricts;
}

/**
 * Get available ACS years
 * Recent years may not yet have 1-year estimates at CD level
 *
 * @returns {Array<number>} Available years
 */
function getAvailableYears() {
  const currentYear = new Date().getFullYear();
  // ACS 1-year data typically released ~1 year after collection
  // e.g., 2023 data released in late 2024
  return [currentYear - 2, currentYear - 3, currentYear - 4];
}

module.exports = {
  fetchACS1Year,
  getAvailableYears,
  CENSUS_BASE_URL,
  CENSUS_VARIABLES
};
