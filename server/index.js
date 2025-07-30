// 서버 시작 파일 (MySQL + 라우터 연결)

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// DB 연결 풀 생성
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'myusers'
});

// 모든 라우터에서 pool 사용 가능하도록 등록
app.set('db', pool);

// 👉 라우터 연결
const userRoutes = require('./routes/user');
app.use('/user', userRoutes);

// 서버 실행
app.listen(port, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${port}`);
});
