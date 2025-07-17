const express = require('express');
const cors = require('cors');
const app = express();
const port = 3001;

app.use(cors()); // 프론트에서 요청 허용

// GET 요청 처리
app.get('/api/dashboard', (req, res) => {
  res.json({
todayStudyTime: "3시간 00분",
    solvedProblems: 15,
    savedNotes: 8,
    accuracy: 87,
    subjectStats: {
      수학: 75,
      영어: 60,
      과학: 90
    }
  });
});

app.listen(port, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${port}`);
});
