fetch("http://localhost:5002/api/stats/user?user=default&t=" + Date.now()).then(r => r.text()).then(t => console.log("Response:", t)).catch(e => console.error("Error:", e));
