const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const dataJsonPath = path.join(__dirname, '..', 'data', 'employee_attrition.json');
const dataCsvPath = path.join(__dirname, '..', 'data', 'employee_attrition.csv');

// In-memory cache for fast querying
let datasetCache = null;

function loadDataset() {
  if (!datasetCache) {
    if (fs.existsSync(dataJsonPath)) {
      datasetCache = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
    } else {
      datasetCache = [];
    }
  }
  return datasetCache;
}

// GET /api/v2/dataset - Paginated and filtered employee attrition records
router.get('/', (req, res) => {
  try {
    let records = loadDataset();

    const {
      search,
      education,
      city,
      gender,
      paymentTier,
      everBenched,
      leaveOrNot,
      minAge,
      maxAge,
      minExp,
      maxExp,
      page = 1,
      limit = 25,
      sortBy = 'id',
      sortOrder = 'asc'
    } = req.query;

    let filtered = [...records];

    if (search) {
      const q = search.toString().toLowerCase().trim();
      filtered = filtered.filter(item =>
        item.id.toString().includes(q) ||
        item.Education.toLowerCase().includes(q) ||
        item.City.toLowerCase().includes(q) ||
        item.Gender.toLowerCase().includes(q) ||
        item.JoiningYear.toString().includes(q)
      );
    }

    if (education && education !== 'All') {
      filtered = filtered.filter(item => item.Education === education);
    }

    if (city && city !== 'All') {
      filtered = filtered.filter(item => item.City === city);
    }

    if (gender && gender !== 'All') {
      filtered = filtered.filter(item => item.Gender === gender);
    }

    if (paymentTier && paymentTier !== 'All') {
      filtered = filtered.filter(item => item.PaymentTier === parseInt(paymentTier, 10));
    }

    if (everBenched && everBenched !== 'All') {
      filtered = filtered.filter(item => item.EverBenched.toLowerCase() === everBenched.toLowerCase());
    }

    if (leaveOrNot !== undefined && leaveOrNot !== 'All' && leaveOrNot !== '') {
      filtered = filtered.filter(item => item.LeaveOrNot === parseInt(leaveOrNot, 10));
    }

    if (minAge) {
      filtered = filtered.filter(item => item.Age >= parseInt(minAge, 10));
    }
    if (maxAge) {
      filtered = filtered.filter(item => item.Age <= parseInt(maxAge, 10));
    }

    if (minExp) {
      filtered = filtered.filter(item => item.ExperienceInCurrentDomain >= parseInt(minExp, 10));
    }
    if (maxExp) {
      filtered = filtered.filter(item => item.ExperienceInCurrentDomain <= parseInt(maxExp, 10));
    }

    // Sorting
    filtered.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB);
        return sortOrder === 'desc' ? -cmp : cmp;
      }
      return sortOrder === 'desc' ? (valB - valA) : (valA - valB);
    });

    const total = filtered.length;

    if (limit === 'all' || limit === '-1') {
      return res.json({
        success: true,
        total,
        page: 1,
        limit: total,
        totalPages: 1,
        data: filtered
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 25);
    const totalPages = Math.ceil(total / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedData = filtered.slice(startIndex, startIndex + limitNum);

    res.json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      data: paginatedData
    });
  } catch (err) {
    console.error('[Dataset API Error]', err);
    res.status(500).json({ success: false, error: 'Failed to query dataset: ' + err.message });
  }
});

// GET /api/v2/dataset/stats - Complete workforce analytics and attrition statistics
router.get('/stats', (req, res) => {
  try {
    const records = loadDataset();
    const total = records.length;

    if (total === 0) {
      return res.json({ success: true, total: 0, stats: {} });
    }

    let leftCount = 0;
    let benchedCount = 0;
    let totalAge = 0;
    let totalExperience = 0;

    const byEducation = {};
    const byCity = {};
    const byGender = {};
    const byTier = {};
    const byYear = {};
    const byExp = {};

    records.forEach(item => {
      if (item.LeaveOrNot === 1) leftCount++;
      if (item.EverBenched === 'Yes') benchedCount++;
      totalAge += item.Age;
      totalExperience += item.ExperienceInCurrentDomain;

      // By Education
      if (!byEducation[item.Education]) byEducation[item.Education] = { total: 0, left: 0 };
      byEducation[item.Education].total++;
      if (item.LeaveOrNot === 1) byEducation[item.Education].left++;

      // By City
      if (!byCity[item.City]) byCity[item.City] = { total: 0, left: 0 };
      byCity[item.City].total++;
      if (item.LeaveOrNot === 1) byCity[item.City].left++;

      // By Gender
      if (!byGender[item.Gender]) byGender[item.Gender] = { total: 0, left: 0 };
      byGender[item.Gender].total++;
      if (item.LeaveOrNot === 1) byGender[item.Gender].left++;

      // By Tier
      const tierKey = 'Tier ' + item.PaymentTier;
      if (!byTier[tierKey]) byTier[tierKey] = { total: 0, left: 0 };
      byTier[tierKey].total++;
      if (item.LeaveOrNot === 1) byTier[tierKey].left++;

      // By Year
      if (!byYear[item.JoiningYear]) byYear[item.JoiningYear] = { total: 0, left: 0 };
      byYear[item.JoiningYear].total++;
      if (item.LeaveOrNot === 1) byYear[item.JoiningYear].left++;

      // By Experience
      const expKey = item.ExperienceInCurrentDomain + ' yrs';
      if (!byExp[expKey]) byExp[expKey] = { total: 0, left: 0 };
      byExp[expKey].total++;
      if (item.LeaveOrNot === 1) byExp[expKey].left++;
    });

    const addRates = (obj) => {
      const resObj = {};
      for (const [key, val] of Object.entries(obj)) {
        resObj[key] = {
          total: val.total,
          left: val.left,
          retained: val.total - val.left,
          rate: Number(((val.left / val.total) * 100).toFixed(1))
        };
      }
      return resObj;
    };

    const stats = {
      totalRecords: total,
      retainedCount: total - leftCount,
      leftCount,
      attritionRate: Number(((leftCount / total) * 100).toFixed(1)),
      retentionRate: Number((((total - leftCount) / total) * 100).toFixed(1)),
      avgAge: Number((totalAge / total).toFixed(1)),
      avgExperience: Number((totalExperience / total).toFixed(1)),
      benchedCount,
      benchedRate: Number(((benchedCount / total) * 100).toFixed(1)),
      byEducation: addRates(byEducation),
      byCity: addRates(byCity),
      byGender: addRates(byGender),
      byPaymentTier: addRates(byTier),
      byJoiningYear: addRates(byYear),
      byExperience: addRates(byExp)
    };

    res.json({ success: true, stats });
  } catch (err) {
    console.error('[Dataset Stats Error]', err);
    res.status(500).json({ success: false, error: 'Failed to compute stats: ' + err.message });
  }
});

// POST /api/v2/dataset/predict - AI Turnover Probability Estimator
router.post('/predict', (req, res) => {
  try {
    const { Education, JoiningYear, City, PaymentTier, Age, Gender, EverBenched, ExperienceInCurrentDomain } = req.body;
    
    // Statistical weights derived from the 4,653 dataset records:
    // Base probability: ~0.34
    let riskScore = 0.34;

    // Payment tier factor: Tier 1 (0.36) vs Tier 2 (0.59) vs Tier 3 (0.28)
    if (parseInt(PaymentTier, 10) === 2) riskScore += 0.22;
    else if (parseInt(PaymentTier, 10) === 1) riskScore += 0.05;
    else riskScore -= 0.08;

    // Ever benched factor: Yes (~0.45) vs No (~0.32)
    if (EverBenched === 'Yes') riskScore += 0.14;

    // City factor: Pune has higher attrition (~0.50), Bangalore (~0.27), New Delhi (~0.31)
    if (City === 'Pune') riskScore += 0.16;
    else if (City === 'New Delhi') riskScore -= 0.03;
    else if (City === 'Bangalore') riskScore -= 0.07;

    // Joining year factor: 2018 joins had huge leave rate (~0.98), 2017 (~0.27)
    if (parseInt(JoiningYear, 10) >= 2018) riskScore += 0.38;
    else if (parseInt(JoiningYear, 10) <= 2014) riskScore -= 0.06;

    // Gender factor: Females in dataset have slightly higher attrition (~0.47 vs 0.25)
    if (Gender === 'Female') riskScore += 0.12;
    else riskScore -= 0.08;

    // Education factor: Masters (~0.39), Bachelors (~0.34), PHD (~0.25)
    if (Education === 'Masters') riskScore += 0.05;
    else if (Education === 'PHD') riskScore -= 0.09;

    // Age factor
    const ageNum = parseInt(Age, 10) || 28;
    if (ageNum < 25) riskScore += 0.06;
    else if (ageNum > 35) riskScore -= 0.05;

    // Clamp between 0.04 and 0.96
    const finalProb = Math.min(0.96, Math.max(0.04, riskScore));
    const percentage = Math.round(finalProb * 100);

    let riskLevel = 'Low';
    let recommendation = 'Standard talent retention cadence recommended.';
    let color = '#19f0c4';

    if (percentage >= 65) {
      riskLevel = 'Critical High';
      recommendation = 'Immediate engagement review! Discuss growth pathway, compensation tier, and project benchmarking.';
      color = '#ff3b5c';
    } else if (percentage >= 40) {
      riskLevel = 'Moderate';
      recommendation = 'Schedule 1-on-1 check-in. Review workload and domain alignment.';
      color = '#ff8a1f';
    }

    res.json({
      success: true,
      prediction: {
        probability: finalProb,
        percentage,
        riskLevel,
        recommendation,
        color,
        inputs: { Education, JoiningYear, City, PaymentTier, Age, Gender, EverBenched, ExperienceInCurrentDomain }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Prediction error: ' + err.message });
  }
});

// POST /api/v2/dataset - Add new record
router.post('/', (req, res) => {
  try {
    const { Education, JoiningYear, City, PaymentTier, Age, Gender, EverBenched, ExperienceInCurrentDomain, LeaveOrNot } = req.body;

    if (!Education || !City || !Gender || JoiningYear === undefined) {
      return res.status(400).json({ success: false, error: 'Required fields missing.' });
    }

    const records = loadDataset();
    const newId = records.length > 0 ? Math.max(...records.map(r => r.id || 0)) + 1 : 1;

    const newRecord = {
      id: newId,
      Education: Education.trim(),
      JoiningYear: parseInt(JoiningYear, 10) || new Date().getFullYear(),
      City: City.trim(),
      PaymentTier: parseInt(PaymentTier, 10) || 3,
      Age: parseInt(Age, 10) || 28,
      Gender: Gender.trim(),
      EverBenched: EverBenched === 'Yes' ? 'Yes' : 'No',
      ExperienceInCurrentDomain: parseInt(ExperienceInCurrentDomain, 10) || 0,
      LeaveOrNot: parseInt(LeaveOrNot, 10) || 0
    };

    records.unshift(newRecord);
    fs.writeFileSync(dataJsonPath, JSON.stringify(records, null, 2), 'utf8');

    // Also append to CSV
    const csvLine = `\n${newRecord.Education},${newRecord.JoiningYear},${newRecord.City},${newRecord.PaymentTier},${newRecord.Age},${newRecord.Gender},${newRecord.EverBenched},${newRecord.ExperienceInCurrentDomain},${newRecord.LeaveOrNot}`;
    fs.appendFileSync(dataCsvPath, csvLine, 'utf8');

    res.json({
      success: true,
      message: 'Employee record added successfully.',
      record: newRecord
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to add record: ' + err.message });
  }
});

// GET /api/v2/dataset/export - Download full CSV or JSON
router.get('/export', (req, res) => {
  const { format = 'csv' } = req.query;
  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="employee_attrition_dataset.json"');
    return res.sendFile(dataJsonPath);
  } else {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="employee_attrition_dataset.csv"');
    return res.sendFile(dataCsvPath);
  }
});

module.exports = router;
