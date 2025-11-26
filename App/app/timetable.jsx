import {Text, View} from "react-native";
import React, {useEffect, useState} from "react";
import {apiGetMyTimetable} from "../Helper/Data";
import {collection, getDocs} from "firebase/firestore";
import {db} from "../firebaseConfig";
import {getUser, getAuthToken} from "../Helper/storage";
import InfoBar from "../Components/InfoBar";
import Loading from "../Components/Loading";
import DaySelector from "../Components/DaySelector";
import Slot from "../Components/Slot";
import Schedule from "../Components/Schedule";


const App = ()=> {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [timetable, setTimetable] = useState(null);
    const [url, setUrl] = useState("");
    const [token, setToken] = useState(null);
    const [day, setDay] = useState(new Date().getDay());

    const dayOptions = ["MON","TUES","WED","THUR","FRI","SAT"];

    useEffect(() => {
        const initialfetch = async () => {
            try {
                const userData = await getUser();
                const tok = await getAuthToken();
                if (userData) { setUser(userData); }
                if (tok) { setToken(tok); }
            } catch (err) {
                console.error('Error fetching initial data:', err);
                alert(err);
            } finally {
                setLoading(false);
            }
        }
        initialfetch();
    },[])

    useEffect(() => {
        const fetch = async () => {
            try {
                if (token) {
                    const tt = await apiGetMyTimetable(token);
                    setTimetable(tt);
                }
            } catch (error) { alert(error.message || 'error'); }
        };
        fetch();
    }, [token])

    useEffect(() => {
        console.log(JSON.stringify(timetable));
        console.log(JSON.stringify(user));
    }, [timetable]);


    if (loading || !timetable) {
        return (
            <View style={{flex: 1,justifyContent: "center"}}>
                <Loading />
            </View>
        );
    }

    return (
        <View>
            <InfoBar batch={user?.batch} year={user?.year} name={user?.name} />
            <DaySelector dayIdx = {day} setDayIdx = {setDay} />
            {Array.isArray(timetable?.days) ? (
                <Schedule timetable={transformBackendTimetableForUI(timetable, day)} />
            ) : null}
        </View>
    )
}

const transformBackendTimetableForUI = (tt, dayIdx) => {
    const dayDoc = tt.days.find(d => d.day === dayIdx) || null;
    const out = {};
    if (!dayDoc) return out;
    for (const col of (dayDoc.cols || [])) {
        const hr = col.start_time?.hr || 0;
        const min = col.start_time?.min || 0;
        const endMin = min + (col.duration || 0);
        const startStr = `${String(hr).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
        const endStr = `${String(hr).padStart(2,'0')}:${String(endMin%60).padStart(2,'0')}`;
        const key = `${startStr} - ${endStr}`;
        const slots = [];
        for (const s of (col.schedules || [])) {
            const c = s.course || {};
            slots.push({ type: (s.slot_type && s.slot_type[0]) || 'L', name: c.name || c.code || '', code: c.code || '', room: s.room || '', teacher: Array.isArray(s.teacher) ? s.teacher.join('/') : (s.teacher || '') });
        }
        if (slots.length) { out[key] = slots; }
    }
    return out;
};

export default App;
