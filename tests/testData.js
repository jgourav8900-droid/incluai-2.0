const fs = require('fs');
const os = require('os');
const path = require('path');

function createTestData() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'incluai-test-'));
  fs.writeFileSync(path.join(dataDir, 'employee_attrition.json'), JSON.stringify([
    {
      id: 1, Education: 'Bachelors', JoiningYear: 2017, City: 'Bangalore',
      PaymentTier: 3, Age: 28, Gender: 'Male', EverBenched: 'No',
      ExperienceInCurrentDomain: 3, LeaveOrNot: 0
    },
    {
      id: 2, Education: 'Masters', JoiningYear: 2018, City: 'Pune',
      PaymentTier: 2, Age: 32, Gender: 'Female', EverBenched: 'Yes',
      ExperienceInCurrentDomain: 5, LeaveOrNot: 1
    }
  ]));
  fs.writeFileSync(path.join(dataDir, 'employee_attrition.csv'), 'Education,JoiningYear,City,PaymentTier,Age,Gender,EverBenched,ExperienceInCurrentDomain,LeaveOrNot\n');
  process.env.INCLUAI_DATA_DIR = dataDir;
  return () => fs.rmSync(dataDir, { recursive: true, force: true });
}

module.exports = { createTestData };
