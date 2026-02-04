// realtime.js - Håndterer alle Supabase Realtime subscriptions

// Holder styr på aktive subscriptions
const activeChannels = new Map();

/**
 * Subscribe til nye meldinger for innlogget bruker
 * @param {string} userId - Current user's ID
 * @param {Function} callback - Function to call when new message arrives
 * @returns {Function} Unsubscribe function
 */
function subscribeToMessages(userId, callback) {
    if (!userId) {
        console.error('subscribeToMessages: userId is required');
        return () => { };
    }

    const channelName = `messages:${userId}`;

    // Unsubscribe fra eksisterende channel hvis den finnes
    if (activeChannels.has(channelName)) {
        console.log('Unsubscribing from existing messages channel');
        activeChannels.get(channelName).unsubscribe();
    }

    console.log('Subscribing to messages for user:', userId);

    const channel = db
        .channel(channelName)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `to_id=eq.${userId}`
            },
            (payload) => {
                console.log('New message received via Realtime:', payload);
                callback(payload.new);
            }
        )
        .subscribe((status) => {
            console.log('Messages subscription status:', status);
        });

    activeChannels.set(channelName, channel);

    // Return unsubscribe function
    return () => {
        console.log('Unsubscribing from messages channel');
        channel.unsubscribe();
        activeChannels.delete(channelName);
    };
}

/**
 * Subscribe til nye posts i feeden
 * @param {Function} callback - Function to call when new post is created
 * @returns {Function} Unsubscribe function
 */
function subscribeToFeed(callback) {
    const channelName = 'feed:posts';

    // Unsubscribe fra eksisterende channel hvis den finnes
    if (activeChannels.has(channelName)) {
        console.log('Unsubscribing from existing feed channel');
        activeChannels.get(channelName).unsubscribe();
    }

    console.log('Subscribing to feed posts');

    const channel = db
        .channel(channelName)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'posts'
            },
            async (payload) => {
                console.log('New post received via Realtime:', payload);

                // Hent full post-info med forfatter-data
                const { data: fullPost, error } = await db
                    .from('posts')
                    .select(`
                        *,
                        author:user_id (
                            id,
                            name,
                            avatar,
                            role
                        )
                    `)
                    .eq('id', payload.new.id)
                    .single();

                if (!error && fullPost) {
                    callback(fullPost);
                } else {
                    console.error('Error fetching full post:', error);
                }
            }
        )
        .subscribe((status) => {
            console.log('Feed subscription status:', status);
        });

    activeChannels.set(channelName, channel);

    // Return unsubscribe function
    return () => {
        console.log('Unsubscribing from feed channel');
        channel.unsubscribe();
        activeChannels.delete(channelName);
    };
}

/**
 * Subscribe til conversation messages mellom to brukere
 * @param {string} userId - Current user's ID
 * @param {string} otherUserId - Other user's ID
 * @param {Function} callback - Function to call when new message arrives
 * @returns {Function} Unsubscribe function
 */
function subscribeToConversation(userId, otherUserId, callback) {
    if (!userId || !otherUserId) {
        console.error('subscribeToConversation: both userId and otherUserId are required');
        return () => { };
    }

    const channelName = `conversation:${userId}:${otherUserId}`;

    // Unsubscribe fra eksisterende channel hvis den finnes
    if (activeChannels.has(channelName)) {
        console.log('Unsubscribing from existing conversation channel');
        activeChannels.get(channelName).unsubscribe();
    }

    console.log('Subscribing to conversation between:', userId, 'and', otherUserId);

    const channel = db
        .channel(channelName)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `from_id=eq.${otherUserId}`
            },
            async (payload) => {
                // Sjekk om meldingen er til oss
                if (payload.new.to_id === userId) {
                    console.log('New conversation message received:', payload);

                    // Hent sender info
                    const { data: sender, error } = await db
                        .from('profiles')
                        .select('id, name, avatar')
                        .eq('id', payload.new.from_id)
                        .single();

                    if (!error && sender) {
                        callback({
                            ...payload.new,
                            sender: sender
                        });
                    }
                }
            }
        )
        .subscribe((status) => {
            console.log('Conversation subscription status:', status);
        });

    activeChannels.set(channelName, channel);

    // Return unsubscribe function
    return () => {
        console.log('Unsubscribing from conversation channel');
        channel.unsubscribe();
        activeChannels.delete(channelName);
    };
}

/**
 * Unsubscribe fra alle aktive channels (kall ved logout)
 */
function unsubscribeAll() {
    console.log('Unsubscribing from all channels:', activeChannels.size);

    activeChannels.forEach((channel, name) => {
        console.log('Unsubscribing from:', name);
        channel.unsubscribe();
    });

    activeChannels.clear();
}

/**
 * Cleanup når vinduet lukkes
 */
window.addEventListener('beforeunload', () => {
    unsubscribeAll();
});
