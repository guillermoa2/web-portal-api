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

/*
Alternative to using placeholders in query connection:

const conn = await this.dbPool.getConnection();
conn.config.namedPlaceholders = true;

const id = req.user.id;
const someVarName = moment();

await conn.query(`SELECT * from table where id = :id and time > :someVarName`,{id,someVarName});
*/

class zoomService {

    static async getAllMeetings(req, res, next) {
        // should get a list of meeting id and name only
        const connection = await mysql.createConnection(config)
        // [varName] shortcut for first element in array

        const [meetings] = await connection.query(`
            SELECT DISTINCT name, time
            FROM meeting 
        `);

        /*
        const [meetings] = await connection.query(`
            SELECT  m.name, m.time, m.agenda, a.email
            FROM nonprofitapp_data.meeting m
            JOIN nonprofitapp_data.attendee a
            ON m.id = a.meeting_id
        `);

        let existingMeetingNames = [];
        let existingMeetingTimes = [];
        let meetingsSorted = [];

        meetings.filter(meeting => {
            if( !(existingMeetingNames.includes(meeting.name)) && !(existingMeetingTimes.includes(meeting.times))) {
                existingMeetingNames.push(meeting.name);
                existingMeetingTimes.push(meeting.time);
                meetingsSorted.push(meeting);
            }else {
                let y = meetingsSorted.find(x => x.name == meeting.name)
                y.email = y.email.split(' ')
                y.email.push(meeting.email)
                console.log('y', y.email)
            }
        })
        // console.log(existingMeetingNames, existingMeetingTimes)
        console.log(meetingsSorted)*/
        
        res.json({meetings})
    };

    static async getMeetingContent(req, res, next){
        const meeting_id = req.params.id;
        const connection = await mysql.createConnection(config);
        // console.log(req.params);
        // select all data associated with meeting id = meeting_id.
        // this means (for now) just the attendees content.
        const [meetingDuplicates] = await connection.query(`
            SELECT name, time, agenda, email
            FROM meeting m
            JOIN attendee a
            ON m.id = a.meeting_id
            WHERE ${meeting_id} = m.id
        `, {
            name: req.body.name,
            time: req.body.time,
            agenda: req.body.agenda,
            email: req.body.email
        });

        // let y = meetings.find(x => x.email == meeting.email)
        //         y.email = y.email.split(' ')
        //         y.email.push(meeting.email)

        let emailArr = []
        const first = 0;
        meetingDuplicates.forEach(duplicate => emailArr.push(duplicate.email))
        meetingDuplicates[first].email = emailArr;
        meetingDuplicates[first].email
        let formattedMeeting = meetingDuplicates[first]

        res.json(formattedMeeting);
    }

    static async addMeeting(req, res, next) {
        const connection = await mysql.createConnection(config);
        connection.connection.config.namedPlaceholders = true;
        // console.log(req.body);
        // console.log(req.body.time);
        const [meetings] = await connection.query(`
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
                    meeting_id: meetings.insertId
                })
            }
        }

        try {
            console.log('meeting', meetings)
        } catch (err) {
            console.log('err', err)
        }

        // return 'done'
        await connection.commit();
        res.send('addMeeting done')
    };

    static async cancelMeeting(req, res, next) {
        try {
            const connection = await mysql.createConnection(config);
            connection.connection.config.namedPlaceholders = true;
            const meetingRecord = req.body;
            // console.log('meetingRecord', meetingRecord);
            const [meeting] = await connection.query(`
                DELETE FROM meeting
                WHERE id = :id
            `, {
                id: meetingRecord.id
            });
            const [attendees] = await connection.query(`DELETE from attendee where meeting_id = :id`,{id: meetingRecord.id});
            await connection.commit();
            console.log('canceledMeeting', meeting);
            console.log('canceledMeetingAttendees', attendees);
            // try deleting again. 
        } catch (err) {
            console.log('err', err)
        }

        res.send('deleteMeting complete')
    }

}
module.exports = zoomService