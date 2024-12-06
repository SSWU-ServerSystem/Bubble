"use strict";

const express = require("express"),
    app = express(),
    path = require('path'),
    moment = require('moment-timezone'),
    homeController = require("./controllers/homeController"), // 메인 로그인
    errorController = require("./controllers/errorController"), // 에러 관련
    subscriberController = require("./controllers/subscriberController"), // 회원가입 및 회원 정보
    machineController = require("./controllers/machineController"),
    reservationController = require("./controllers/reservationController"),
    userHomeController = require("./controllers/userHomeController"),
    userMachineController = require("./controllers/userMachineController"),
    weatherController = require("./controllers/weatherController"),
    statisticController = require("./controllers/statisticController"),
    noticeController = require("./controllers/noticeController"),
    showNoticeController = require("./controllers/showNoticeController"),
    usersController = require("./controllers/usersController"), // 로그인 인증 및 로그아웃
    reviewsController = require("./controllers/reviewsController"), // 리뷰
    userUsingController = require("./controllers/userUsingController"), // 잔여 시간 관련
    branchController = require("./controllers/branchController"), // 빨래방 지점
    newsController = require("./controllers/newsController"), // news
    myPageController = require("./controllers/myPageController"), // myPage
    passwordController = require("./controllers/passwordController"), // password
    passwordRoutes = require('./routes/passwordRoutes'), // password
    changepwController = require("./controllers/changepwController"), //mypagePw
    reviewReportController = require("./controllers/reviewReportController"), // 리뷰 신고 (관리자용)
    { consumeFromQueue } = require('./controllers/rabbitMQ/rabbitmqConsumer'),
    qnaChatController = require("./controllers/rabbitMQ/rabbitMQ-api"), //문의
    layouts = require("express-ejs-layouts"),
    bodyParser = require('body-parser'),
    session = require('express-session'),
    flash = require('connect-flash'),
    cookieParser = require("cookie-parser"),
    passport = require("passport"),
    bcrypt = require('bcrypt'),
    db = require("./models/index"),
    Sequelize = db.Sequelize,
    axios = require('axios'), // news
    cheerio = require('cheerio'), // news
    Op = Sequelize.Op;

// 모델 동기화 -> 신고 consumer 세팅
db.sequelize.sync().then(() => {
    console.log('Database synchronized');
    consumeFromQueue('reportsQueue')
        .then(() => console.log('reportConsumer setup completed'))
        .catch(err => console.error('Error setting up consumer:', err));
}).catch(console.error);

app.set("port", process.env.PORT || 80);
app.set("view engine", "ejs"); // 애플리케이션 뷰 엔진을 ejs로 설정
app.set('views', path.join(__dirname, 'views'));

// 정적 뷰 제공
app.use(express.static("public"));
// 레이아웃 설정
app.use(layouts);
// 데이터 파싱
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 600000 } // 세션 유지 시간 설정 (밀리초 단위)
}));
app.use(flash());
app.locals.moment = moment;
app.use((req, res, next) => {
    if (req.session.user) {
        res.locals.user = req.session.user;
    } else {
        res.locals.user = null;
    }
    res.locals.messages = req.flash();
    next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// 라우트 등록
app.get("/subscribers/getSubscriber", subscriberController.getAllSubscribers);
app.get("/subscribers/subscriber", subscriberController.getSubscriptionPage); // 폼 입력이 가능한 웹 페이지 렌더링
app.post("/subscribers/subscriber", subscriberController.saveSubscriber); // 넘겨받은 POST 데이터 저장 및 처리
app.post('/subscribers/send-auth-code', subscriberController.sendAuthCode); // 이메일 인증 코드 전송 라우트

app.post('/logout', usersController.logout);
app.post('/deleteAccount', usersController.deleteAccount);

app.post("/reservations", reservationController.createReservation);

app.get("/user/userHome", userHomeController.getUserReservations);
app.get("/user/userReserve", reservationController.getAllReservations);
app.get("/user/userUsing", userUsingController.getUserUsingPage);
app.get("/user/userMachine", userMachineController.getUserMachines);

app.get("/manager/getMachine",machineController.getAllMachines);
app.post("/report-issue",machineController.reportIssue);
app.post("/report-completed", machineController.reportCompleted);
app.get("/manager/getReservation",reservationController.getAllReservations);
app.get("/manager/getStatistic", statisticController.getAllStatistics);
app.get('/manager/getNotice', noticeController.getNoticePage);
app.post('/manager/getNotice', noticeController.createNotice);

app.get("/reviews/getReviews", reviewsController.getAllReviews);
app.post("/reviews/getReviews/favorites", reviewsController.addFavorites);
app.get("/reviews/writeReviews", reviewsController.getReviewsPage);
app.post("/reviews/writeReviews", reviewsController.saveReviews);
app.get("/reviews/reports", reviewReportController.getReports);
app.post('/reviews/reportReview', reviewsController.reportReview);
app.delete('/reviews/deleteReport/:id', reviewReportController.deleteReport);
app.get('/reviews/deleteReview/:id', reviewsController.deleteReview);

app.get('/showNotice', showNoticeController.getAllNotices);
app.post('/showNotice/deleteNotice/:noticeNumber', showNoticeController.deleteNotice);
app.use("/getWeather", weatherController);
app.use("/getNews", newsController); // 뉴스 라우트
app.use('/password', passwordRoutes); // 비밀번호 라우트
app.use('/changePassword', passwordRoutes); //mypagePw
app.get("/myPage", myPageController.getAllMyPage);
app.get("/myPage/getMyFavorites", myPageController.getALLMyFavorites);

app.get('/user/getBranches', branchController.getBranches);
app.post('/user/userReserve', reservationController.createReservation);

app.get("/", homeController.showIndex);
app.post("/", usersController.authenticate, usersController.redirectView);


//문의 채팅
app.post("/user/qnaChat/chatting", qnaChatController.send_message);
app.get("/user/qnaChat/chatting", qnaChatController.recv_message);

app.post("/manager/qnaChat/chatting", qnaChatController.send_message);
app.get("/manager/qnaChat/chatting", qnaChatController.recv_message);

app.get("/manager/qnaChat/chatLogs", qnaChatController.getChatLogs);
app.get("/user/qnaChat/chatLogs", qnaChatController.getChatLogs);

app.get("/user/qnaChat/getManagerEmail", qnaChatController.getManagerEmail);

app.get("/user/qnaChat", qnaChatController.renderChatPage);
app.get("/manager/qnaChat", qnaChatController.renderChatPage);

app.use(errorController.logErrors);
app.use(errorController.respondNoResourceFound);
app.use(errorController.respondInternalError);
app.use(errorController.pageNotFoundError);
app.use(errorController.internalServerError);

app.listen(app.get("port"), () => {
    console.log(`Server running on port: ${app.get("port")}`);
});
