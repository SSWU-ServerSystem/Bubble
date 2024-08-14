const nodemailer = require('nodemailer');
const crypto = require('crypto');
const db = require('../models/index');
const TempSubscriber = db.tempSubscriber;

// 이메일 주소와 비밀번호를 코드에 직접 설정합니다.
const EMAIL_USER = 'coin.bubblebubble@gmail.com';
const EMAIL_PASS = 'oepq lqjc chdh hymn'; // 실제 비밀번호를 입력하세요.

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
});

exports.sendVerificationCode = async (req, res) => {
    try {
        const { email } = req.body;
        const code = crypto.randomInt(100000, 999999); // 6자리 인증 코드
        const expiresAt = Date.now() + 15 * 60 * 1000; // 15분 후 만료

        const [result] = await TempSubscriber.findOrCreate({
            where: { email },
            defaults: {
                verificationCode: code,
                verificationExpires: expiresAt
            }
        });

        if (!result[1]) { // 이미 존재하는 사용자
            await TempSubscriber.update(
                { verificationCode: code, verificationExpires: expiresAt },
                { where: { email } }
            );
        }

        await transporter.sendMail({
            from: EMAIL_USER,
            to: email,
            subject: '이메일 인증 코드',
            text: `인증 코드: ${code}`
        });

        res.status(200).send('인증 코드가 이메일로 전송되었습니다.');
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.verifyCode = async (req, res) => {
    try {
        const { email, verificationCode } = req.body;

        const tempSubscriber = await TempSubscriber.findOne({ where: { email } });

        if (!tempSubscriber) {
            return res.status(400).send('유효하지 않은 이메일입니다.');
        }

        if (tempSubscriber.verificationCode !== parseInt(verificationCode, 10)) {
            return res.status(400).send('인증 코드가 일치하지 않습니다.');
        }

        if (Date.now() > tempSubscriber.verificationExpires) {
            return res.status(400).send('인증 코드가 만료되었습니다.');
        }

        // 인증 완료 후 TempSubscriber의 isVerified를 true로 설정
        await TempSubscriber.update(
            { isVerified: true },
            { where: { email } }
        );

        res.status(200).send('인증이 성공적으로 완료되었습니다.');
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};









       










