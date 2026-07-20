const url = "http://localhost:5000";
const register = async (username, password) => {
    try {
        const response = await fetch(`${url}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        if (!response.ok) {
            console.error('Error registering user');
            return response.json();
        }
        return response.json();
    } catch (error) {
        console.error('Error registering user:', error);
        throw error;
    }
};

const login = async (username, password) => {
    try {
        const response = await fetch(`${url}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        if (!response.ok) {
            console.error('Error logging in user');
            return response.json();
        }
        return response.json();
    } catch (error) {
        console.error('Error logging in user:', error);
        throw error;
    }
};

export { register, login };
