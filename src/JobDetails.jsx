import { useEffect, useState, useRef } from "react";
import Pusher from "pusher-js";
import { PaperclipIcon, SendIcon, UserIcon } from "lucide-react";

export default function ChatComponent() {
    const [token, setToken] = useState('');
    const [userId, setUserId] = useState(null);
    const [username, setUsername] = useState('');
    const [conversations, setConversations] = useState([]);
    const [currentChat, setCurrentChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [senderId, setSenderId] = useState(null);
    const [file, setFile] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const baseUrl = 'http://101.101.96.43';
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        setSenderId(username);
    }, [username]);

    useEffect(() => {
        if (isLoggedIn) {
            const pusher = new Pusher('e18109c4b9ff5b7d7c55', { cluster: 'ap1' });
            if (currentChat && !isSending) {
                const channel = pusher.subscribe(`chat.${userId}`);

                channel.bind('MessageSent', (data) => {
                    setMessages(prevMessages => [
                        ...prevMessages,
                        {
                            sender_id: data.sender_id,
                            username: data.sender_name,
                            message: data.message,
                            created_at: data.created_at,
                            file_url: data.file_url
                        }
                    ]);
                });

                return () => {
                    channel.unbind_all();
                    channel.unsubscribe();
                };
            }
        }
    }, [currentChat, isSending, isLoggedIn]);

    useEffect(() => {
        if (isLoggedIn) {
            async function fetchConversations() {
                const response = await fetch(`${baseUrl}/api/messages`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                setConversations(data.data);
            }
            fetchConversations();
        }
    }, [baseUrl, token, isLoggedIn]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const loadMessages = async (userId) => {
        const response = await fetch(`${baseUrl}/api/messages/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setMessages(data.data);
        setCurrentChat(conversations.find(convo => convo.id === userId));
    };

    const submit = async (e) => {
        e.preventDefault();
        setIsSending(true);

        if (!currentChat) {
            console.error('No active chat to send a message');
            setIsSending(false);
            return;
        }

        const userId = currentChat.id;

        const formData = new FormData();
        formData.append('receiver_id', userId);
        formData.append('message', message);
        if (file) {
            formData.append('file', file);
        }

        try {
            const sendResponse = await fetch(`${baseUrl}/api/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (sendResponse.ok) {
                const sendData = await sendResponse.json();
                setMessages(prevMessages => [
                    ...prevMessages,
                    {
                        id: sendData.id,
                        sender_id: senderId,
                        username: username,
                        message: message,
                        created_at: new Date().toISOString(),
                        file_url: file ? sendData.file_url : null,
                    },
                ]);

                setMessage('');
                setFile(null);
            } else {
                console.error('Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${baseUrl}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                setToken(data.access_token);
                setUserId(data.id);
                setIsLoggedIn(true);
            } else {
                console.error('Login failed');
            }
        } catch (error) {
            console.error('Error during login:', error);
        }
    };

    const groupedMessages = [];
    let lastSender = null;

    messages.forEach((msg, index) => {
        const prevMsg = messages[index - 1];
        const isSameSender = msg.sender_id === lastSender;
        const timeDiff = prevMsg ? new Date(msg.created_at) - new Date(prevMsg.created_at) : Infinity;
        const isGrouped = isSameSender && timeDiff < 5 * 60 * 1000;

        if (!isGrouped) {
            groupedMessages.push({ sender: msg.username, messages: [msg] });
        } else {
            groupedMessages[groupedMessages.length - 1].messages.push(msg);
        }
        lastSender = msg.sender_id;
    });

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
            {!isLoggedIn ? (
                <div className="flex items-center justify-center w-full">
                    <form onSubmit={handleLogin} className="bg-white p-6 rounded shadow-md">
                        <h2 className="mb-4 text-lg font-semibold">Login</h2>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            className="w-full px-3 py-2 mb-4 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="w-full px-3 py-2 mb-4 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                        <button type="submit" className="w-full p-2 text-white bg-blue-500 rounded-md">Login</button>
                    </form>
                </div>
            ) : (
                <>
                    <div className="w-1/3 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter username"
                                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        {conversations.map((convo) => (
                            <div
                                key={convo.id}
                                onClick={() => loadMessages(convo.id)}
                                className={`p-4 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${currentChat?.id === convo.id ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
                            >
                                <div className="flex items-center space-x-3">
                                    <UserIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {convo.name}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                            {convo.last_message}
                                        </p>
                                    </div>
                                    <div className="text-xs text-gray-400 dark:text-gray-500">
                                        {new Date(convo.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
                        {currentChat ? (
                            <>
                                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {currentChat.name}
                                    </h2>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {groupedMessages.map((group, index) => (
                                        <div key={index} className="space-y-2">
                                            {group.messages.map((msg, msgIndex) => (
                                                <div
                                                    key={msgIndex}
                                                    className={`${
                                                        msg.sender_id === senderId ? 'text-right' : 'text-left'
                                                    }`}
                                                >
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    <div
                                                        className={`inline-block p-3 rounded-lg ${
                                                            msg.sender_id === senderId
                                                                ? 'bg-blue-500 text-white'
                                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                                                        }`}
                                                    >
                                                        {msg.message}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>

                                <form onSubmit={submit} className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center space-x-3">
                                    <input
                                        type="text"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Type a message..."
                                        className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setFile(e.target.files[0])}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white focus:outline-none"
                                    >
                                        <PaperclipIcon className="w-5 h-5" />
                                    </button>
                                    <button type="submit" disabled={isSending} className="text-blue-500 hover:text-blue-700 focus:outline-none">
                                        <SendIcon className="w-5 h-5" />
                                    </button>
                                </form>
                            </>
                        ) : (
                            <div className="flex items-center justify-center flex-1 text-gray-500 dark:text-gray-400">
                                Select a chat to start messaging
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
