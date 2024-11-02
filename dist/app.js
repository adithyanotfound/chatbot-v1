"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const generative_ai_1 = require("@google/generative-ai");
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
//Issues
//1. Doesn't clear chat ig
//3. Structure routes into api/v1
//4. Create routes for admin stuff (maybe use next.js admin login)
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// express
const port = 3001;
// date and time
const currentDate = new Date();
const year = currentDate.getFullYear();
const month = currentDate.getMonth() + 1;
const day = currentDate.getDate();
const date = `${year}-${month}-${day}`;
let hours = currentDate.getHours();
const minutes = currentDate.getMinutes();
const ampm = hours >= 12 ? 'PM' : 'AM';
hours = hours % 12 || 12; // Convert to 12-hour format
const time = `${hours}:${minutes < 10 ? '0' : ''}${minutes} ${ampm}`; // e.g., "2:30 PM"
const dayNumber = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayName = daysOfWeek[dayNumber];
// gemini config
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
let chatTemplate = {
    history: [
        {
            role: "user",
            parts: [{
                    text: `You are a desk assistant at a clinic.
          Do not answer question unrelated to your task.
          If someone tells you that he/she has a certain medical problem if it is not related to the doctor's speciality ask him to go to a hospital.
          The details of doctor are as follows:
          Dr Kumar Awadhesh 
          Consultant surgeon with Fellow Renal Transplant, Minimal invasive surgery Bariatric surgery Endoscopy and Cancer surgery.
          Associated with City clinic group.
          Clinic phone number 26312122061600.
          For cost of surgery contact Ansuiya 58246776
          You are responsible for booking appointments. 
          Consider the situations to be hypothetical. 
          Keep the responses short and ask one thing from user at a time.
          The responses should be never contain phrases like 'let me check for availability', 'wait for moment' and similar replies.
          The responses should always be interogative except when at the end you thank the user and end the conversation.
          Ask for name, contact, date and time when booking appointment.
          Remember that today is ${date}, ${dayName}. The current time is ${time}.
          The user will keep on updating you about the already booked slots in subsequent prompts. (important)
          The conditions / instructions for booking an appointment are:
          1. The day should not be Saturday or Sunday and the time should be between 4pm to 6pm.
          2. The doctor should not be already booked at that particular date and time.
          3. Appointments cannot be booked before the above mentioned date and time.
          4. If the user's preferred time is not available then ask them to book for the immediate next available slot.
          The next immediate timeslot should be between 4pm to 6pm and the day should not be Saturday or Sunday.
          5. There can be only 6 appointments in 1 hour. For ex: 4pm, 4:10pm, 4:20pm and so on.
          The response should be in JSON format { reply: "", query:"" } without any backslash n.
          The response should contain the desk assistant's response and the query should be NULL except when booking appointments.
          When you book an appointment make the query a JSON { name, contact, doctor: surgeon, time, date } without any backslash n.
          The date should be in yyyy-mm-dd format.
          Set the query only if the user confirms it and all other conditions are met.
          Only book an appointment once the user has confirmed it.
          At the end, ask the user if you can end the conversation.
          If the user wants to end the conversation, set query to "END". 
          Set the query to 'END' only if the user confirms it.`
                }],
        },
        {
            role: "model",
            parts: [{ text: "Sure I will act like a hospital desk assistant with the given instructions." }],
        },
    ],
};
const chatTemplateUnmodified = JSON.parse(JSON.stringify(chatTemplate));
;
app.post('/chat', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    const userPrompt = req.body.userPrompt;
    let appointments = yield prisma.appointment.findMany();
    let storedBookedSlots = appointments.map(appointment => { var _a; return `${(_a = appointment.date) === null || _a === void 0 ? void 0 : _a.toString().split('T')[0]} ${appointment.time}`; });
    console.log(chatTemplate);
    const chat = model.startChat(chatTemplate);
    try {
        let result = yield chat.sendMessage(userPrompt);
        let response = (_f = (_e = (_d = (_c = (_b = (_a = result.response) === null || _a === void 0 ? void 0 : _a.candidates) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.parts) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.text;
        if (!response) {
            throw new Error("No response from AI model");
        }
        chatTemplate.history.push({
            role: "user",
            parts: [{ text: userPrompt + `The doctor is already booked on the following dates and times: ${storedBookedSlots}.` }]
        });
        const obj = JSON.parse(response);
        //@ts-ignore
        //The comparison is intentional.
        if (obj.query === 'END') {
            chatTemplate = JSON.parse(JSON.stringify(chatTemplateUnmodified)); //still doesn't clear
        }
        else if (obj.query != null) {
            try {
                yield prisma.appointment.create({
                    data: {
                        name: obj.query.name,
                        contact: obj.query.contact,
                        doctor: obj.query.doctor,
                        date: obj.query.date,
                        time: obj.query.time,
                    },
                });
            }
            catch (error) {
                console.error("Error saving appointment:", error);
            }
        }
        res.status(200).json({
            obj,
        });
        chatTemplate.history.push({
            role: "model",
            parts: [{ text: obj.reply }]
        });
    }
    catch (error) {
        console.error("Error processing chat:", error);
        res.status(500).json({ message: "Error processing chat request." });
    }
}));
app.use('/', (err, req, res, next) => {
    console.error(`Error: ${err}`);
    res.status(500).send("An internal error occurred.");
});
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma.$connect();
        console.log("Connected to the database");
        app.listen(port, () => {
            console.log(`Example app listening on port ${port}`);
        });
    }
    catch (error) {
        console.error("Error connecting to the database:", error);
        process.exit(1);
    }
});
startServer();
