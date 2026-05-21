export interface PinterestBoard {
    id: string;
    name: string;
    description?: string;
}

export interface PinterestPinData {
    title: string;
    description: string;
    link: string;
    board_id: string;
    media_source: {
        source_type: string;
        url?: string;
        data?: string;
        content_type?: string;
    };
}

export const getPinterestAuthUrl = (clientId: string, redirectUri: string): string => {
    const scope = 'boards:read boards:write pins:read pins:write user_accounts:read';
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('pinterest_auth_state', state);

    return `https://www.pinterest.com/oauth/?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
    )}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;
};

export const exchangePinterestCodeForToken = async (code: string, redirectUri: string) => {
    const response = await fetch('/api/pinterest/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
    });

    if (!response.ok) {
        let errorMsg = 'Failed to exchange code for token';
        try {
            const errorData = await response.json();
            if (errorData.error_description) {
                errorMsg = errorData.error_description;
            } else if (errorData.error) {
                errorMsg = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
            } else if (errorData.message) {
                errorMsg = errorData.message;
            }
        } catch (e) {}
        throw new Error(errorMsg);
    }

    return response.json();
};

export const getPinterestBoards = async (accessToken: string): Promise<PinterestBoard[]> => {
    const response = await fetch('/api/pinterest/boards', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch boards');
    }

    const data = await response.json();
    return data.items || [];
};

export const getPinterestUserAccount = async (accessToken: string) => {
    const response = await fetch('/api/pinterest/user_account', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        let errStr = 'Failed to fetch user account';
        try {
            const errJson = await response.json();
            errStr = JSON.stringify(errJson);
        } catch(e) {}
        throw new Error(errStr);
    }

    return response.json();
};

export const createPinterestPin = async (accessToken: string, pinData: PinterestPinData) => {
    const response = await fetch('/api/pinterest/pins', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(pinData),
    });

    if (!response.ok) {
        let errorMsg = 'Failed to create pin';
        try {
            const errorData = await response.json();
            if (errorData.message) {
                errorMsg = errorData.message;
            } else if (errorData.error_description) {
                errorMsg = errorData.error_description;
            } else if (errorData.error) {
                errorMsg = typeof errorData.error === 'string' ? errorData.error : (errorData.error.message || JSON.stringify(errorData.error));
            }
        } catch (e) {}
        throw new Error(errorMsg);
    }

    return response.json();
};

export const generatePinterestImage = async (prompt: string): Promise<string> => {
    const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
    });
    
    if (!response.ok) {
        throw new Error('Failed to generate image');
    }
    
    const data = await response.json();
    return data.image; // base64 payload
};
