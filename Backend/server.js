const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Mock Employees Data (Phase 1: อย่างน้อย 5 คน มี id, name, position, status, salary)
let employees = [
  { id: "1", name: "John Doe", position: "Software Engineer", status: "Active", salary: 45000 },
  { id: "2", name: "Jane Smith", position: "UI/UX Designer", status: "Active", salary: 38000 },
  { id: "3", name: "Bob Johnson", position: "Project Manager", status: "On Leave", salary: 75000 },
  { id: "4", name: "Alice Brown", position: "HR Officer", status: "Active", salary: 25000 },
  { id: "5", name: "Charlie Green", position: "Intern", status: "Active", salary: 15000 }
];

// 1.1 Authentication Endpoint: POST /api/login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'password123') {
    return res.status(200).json({ success: true, token: "mock-jwt-token" });
  }
  return res.status(401).json({ success: false, message: "Unauthorized" });
});

// 1.2 CRUD API Endpoints
// [GET] /api/employees - Return all employee records
app.get('/api/employees', (req, res) => {
  res.status(200).json(employees);
});

// [POST] /api/employees - Add a new employee (ถ้างดเว้น field ใดๆ ตอบ 400 Bad Request)
app.post('/api/employees', (req, res) => {
  const { name, position, salary } = req.body;
  if (!name || !position || salary === undefined || salary === '') {
    return res.status(400).json({ success: false, message: "Bad Request: Missing required fields" });
  }

  const newEmployee = {
    id: Date.now().toString(),
    name: name.trim(),
    position: position.trim(),
    status: "Active",
    salary: Number(salary)
  };

  employees.push(newEmployee);
  res.status(201).json({ success: true, data: newEmployee });
});

// [PUT] /api/employees/:id/status - Toggle employee's status (Active <-> On Leave)
app.put('/api/employees/:id/status', (req, res) => {
  const { id } = req.params;
  const emp = employees.find(e => e.id === id);
  if (!emp) {
    return res.status(404).json({ success: false, message: "Employee not found" });
  }

  emp.status = emp.status === "Active" ? "On Leave" : "Active";
  res.status(200).json({ success: true, data: emp });
});

// [DELETE] /api/employees/:id - Remove employee
app.delete('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  const index = employees.findIndex(e => e.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Employee not found" });
  }

  employees.splice(index, 1);
  res.status(200).json({ success: true, message: "Employee deleted successfully" });
});

// --- Phase 2: K-Means Salary Clustering API (k=3) ---
// [GET] /api/employees/salary-clusters
app.get('/api/employees/salary-clusters', (req, res) => {
  if (employees.length === 0) {
    return res.status(200).json({ success: true, clusters: [] });
  }

  const salaries = employees.map(e => Number(e.salary));
  
  // กำหนด Centroid เริ่มต้น k=3 จุด (Min, Mid, Max)
  let centroids = [
    Math.min(...salaries),
    (Math.min(...salaries) + Math.max(...salaries)) / 2,
    Math.max(...salaries)
  ];

  let assignments = [];
  let changed = true;
  let loopCount = 0;

  while (changed && loopCount < 100) {
    loopCount++;
    changed = false;

    // Assign เงินเดือนเข้า cluster ที่ใกล้ Centroid ที่สุด
    assignments = salaries.map(salary => {
      const distances = centroids.map(c => Math.abs(salary - c));
      return distances.indexOf(Math.min(...distances));
    });

    // คำนวณหา Centroid ใหม่
    const newCentroids = [0, 1, 2].map(i => {
      const clusterVals = salaries.filter((_, idx) => assignments[idx] === i);
      return clusterVals.length > 0 
        ? clusterVals.reduce((sum, val) => sum + val, 0) / clusterVals.length 
        : centroids[i];
    });

    if (JSON.stringify(centroids) !== JSON.stringify(newCentroids)) {
      centroids = newCentroids;
      changed = true;
    }
  }

  // จัดเรียงลำดับ Centroid จากน้อยไปมากเพื่อให้เป็น Tier 1, 2, 3 ตามโจทย์
  const sortedIndices = centroids
    .map((c, i) => ({ centroid: c, index: i }))
    .sort((a, b) => a.centroid - b.centroid);

  const tierNames = ["Tier 1", "Tier 2", "Tier 3"];
  const resultClusters = sortedIndices.map((item, tierIdx) => {
    const origIdx = item.index;
    const count = assignments.filter(clusterId => clusterId === origIdx).length;
    return {
      group: tierNames[tierIdx],
      centroid: Math.round(item.centroid),
      count: count
    };
  });

  res.status(200).json({
    success: true,
    clusters: resultClusters
  });
});

const PORT = 3085;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});