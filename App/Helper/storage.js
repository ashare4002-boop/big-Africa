import AsyncStorage from '@react-native-async-storage/async-storage';

const storeUser = async (value) => {
    try {
        const jsonValue = JSON.stringify(value);
        await AsyncStorage.setItem('user', jsonValue);
    } catch (e) {
        alert(e)
    }
};

const getUser = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem('user');
        return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
        alert(e)
    }
};

export { getUser, storeUser };

const storeAuth = async (token, userId) => {
    try { await AsyncStorage.setItem('authToken', token); await AsyncStorage.setItem('userId', userId); } catch (e) { alert(e) }
};
const getAuthToken = async () => { try { return await AsyncStorage.getItem('authToken'); } catch (e) { alert(e); return null; } };
const getUserId = async () => { try { return await AsyncStorage.getItem('userId'); } catch (e) { alert(e); return null; } };

export { storeAuth, getAuthToken, getUserId };
