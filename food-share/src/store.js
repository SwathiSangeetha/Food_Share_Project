// ── Global session store — simulates a real-time DB ───────────
// Replace with Firebase / Azure Cosmos DB for production

export const store = {
  // Only 2 fixed demo posts — no auto-adding nonsense
  needPosts: [
    {
      id: "post_1",
      ngoName: "Hope Foundation",
      type: "ngo",
      message: "We need food for 150 people today — lunch and dinner both.",
      location: "Gandhi St, Sriperumbadur",
      lat: 12.9750, lng: 79.9420,
      postedAt: new Date(Date.now() - 18 * 60000).toISOString(),
      urgency: "high",
      peopleCount: 150,
      contact: "+91 94444 11111",
    },
    {
      id: "post_2",
      ngoName: "Murugan Temple",
      type: "temple",
      message: "Need vegetarian food for evening prasad distribution — around 80 people.",
      location: "Temple St, Sriperumbadur",
      lat: 12.9710, lng: 79.9500,
      postedAt: new Date(Date.now() - 42 * 60000).toISOString(),
      urgency: "medium",
      peopleCount: 80,
      contact: "+91 94444 33333",
    },
  ],

  _listeners: [],

  // Called when NGO submits registration form
  addNeedPost(post) {
    const newPost = {
      ...post,
      id: `post_${Date.now()}`,
      postedAt: new Date().toISOString(),
    };
    this.needPosts = [newPost, ...this.needPosts];
    this._listeners.forEach(fn => fn([...this.needPosts]));
  },

  subscribe(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter(l => l !== fn);
    };
  },
};