import { Text, View, StyleSheet, Dimensions, ScrollView } from "react-native";
import Loading from "../Components/Loading";
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import Button from "../Components/Button";
import CC from "../Components/CourseContainer";
import User from "../Components/UserInfo";
import { getUser, storeUser, storeAuth } from "../Helper/storage";
import { router } from "expo-router";
import { apiSignup, apiListCourses, apiSelectCourses, apiGenerateTimetable } from "../Helper/Data";

const { height, width } = Dimensions.get('window');

const app = () => {
    const [loading, setLoading] = useState(true);
    const [metadata, setMetadata] = useState(null);
    const [mode, setMode] = useState(true);
    const [url, setUrl] = useState("");
    const [token, setToken] = useState(null);
    const [user, setUser] = useState({
        name: "",
        year: "1",
        batch: "F1",
        subjects: []
    });

    const saveUser = async () => {
        try {
            await storeUser(user);
        } catch (err) {
            alert(err);
        }
    };
    const fetchSubjects = async () => {
        if (!token) { return; }
        try {
            const res = await apiListCourses(token, null);
            setMetadata(res?.data || []);
        } catch (err) {
            alert('Failed to fetch courses: ' + err.message);
        }
    };


    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const userData = await getUser();
                if (userData) { setUser(userData); }
            } catch (err) {
                console.error('Error fetching initial data:', err);
                alert(err);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    useEffect(() => { fetchSubjects() }, [token]);

    if (loading) {
        return (
            <View style={styles.loadContainer}>
                <Loading />
            </View>
        );
    }

    if (mode) {
        return (
            <View style={styles.loadContainer}>
                <User user={user} setUser={setUser} setMode={setMode} fetchSubjects={fetchSubjects} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView style={{ flex: 1 }}>
                <CC courses={metadata} setUser={setUser} user={user} title="Courses" />
                <View style={styles.button}>
                    <Button
                        height={height * 0.07}
                        width={width * 0.5}
                        text="Apply"
                        onPress={() => {
                            (async () => {
                                try {
                                    const signupPayload = { name: user.name, level: user.year || "1", matricule: `${user.batch || "F1"}-${Date.now()}`, faculty: "Science", department: "Math", password: "pass123", phone: "", network: "" };
                                    const res = await apiSignup(signupPayload);
                                    await storeAuth(res.token, res.user_id);
                                    setToken(res.token);
                                    await storeUser(user);
                                    const selections = (user.subjects || []).map(code => ({ code, category: "Major" }));
                                    if (selections.length) { await apiSelectCourses(res.token, selections); }
                                    const gen = await apiGenerateTimetable(res.token);
                                    if (Array.isArray(gen?.warnings) && gen.warnings.length) { alert(`Clashes detected:\n${gen.warnings.join('\n')}`); }
                                    router.navigate('./timetable');
                                } catch (e) { alert(e.message || 'error'); }
                            })();
                        }}
                    />
                </View>
            </ScrollView>
        </View>
    );
};

export default app;

const styles = StyleSheet.create({
    loadContainer: {
        flex: 1,
        justifyContent: "center",
    },
    container: {
        flex: 1,
        justifyContent: "flex-end",
    },
    button: {
        marginVertical: '5%',
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9,
    },
    subjectsContainer: {
        padding: 20,
        margin: 10,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
    },
    subjectsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subjectItem: {
        fontSize: 16,
        marginVertical: 2,
        paddingLeft: 10,
    },
});
