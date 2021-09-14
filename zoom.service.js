const dotenv = require('dotenv');
dotenv.config({ path: './.env'});
const mysql = require('mysql2/promise');


const config = {
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database,
    port: process.env.port
};

class zoomService {

    static async getAllMeetings(req, res, next) {
        const connection = await mysql.createConnection(config)
        // [varName] shortcut for first element in array
        const [meetings] = await connection.query(`
            SELECT *
            FROM meeting
        `);
        res.json(meetings)
    };

    static async addMeeting(req, res, next) {
        const connection = await mysql.createConnection(config);
        connection.connection.config.namedPlaceholders = true;
        console.log(req.body);
        console.log(req.body.time)
        const [meeting] = await connection.query(`
            INSERT INTO meeting (name, time, agenda)
            VALUES (:name, :time, :agenda)
        `, {
            name: req.body.name,
            time: req.body.time,
            agenda: req.body.agenda
        });

        if(req.body.attendees) {
            for (const email of req.body.attendees) {
                await connection.query(`
                    INSERT INTO attendee (email, meeting_id)
                    VALUES (:email, :meeting_id)
                `, {
                    email,
                    meeting_id: meeting.insertId
                })
            }
        }

        try {
            console.log('meeting', meeting)
        } catch (err) {
            console.log('err', err)
        }

        // return 'done'
        await connection.commit();
        res.send('addMeeting done')
    };

    static async cancelMeeting(req, res, next) {
        const connection = await mysql.createConnection(config);
        connection.connection.config.namedPlaceholders = true;
        const meetingRecord = req.body;
        console.log('meetingRecord', meetingRecord);
        const [meeting] = await connection.query(`
            DELETE FROM meeting
            WHERE id = :id
        `, {
            id: meetingRecord.id
        });

        // unnecessary
        try {
            console.log('canceledMeeting', meeting)
        } catch (err) {
            console.log('err', err)
        }

        res.send('deleteMeting complete')
    }

}
module.exports = zoomService