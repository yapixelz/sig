const admin = require('firebase-admin');
admin.initializeApp();

exports.verifyAgent = functions.https.onCall(async (data, context) => {
    const { agentName, accessCode } = data;
    
    if (!agentName || !accessCode) {
        throw new functions.https.HttpsError(
            'invalid-argument', 
            'Agent name and access code are required'
        );
    }

    const agentsRef = admin.firestore().collection('agents');
    const query = await agentsRef
        .where('name', '==', agentName.toUpperCase())
        .where('code', '==', accessCode)
        .limit(1)
        .get();

    if (query.empty) {
        throw new functions.https.HttpsError(
            'permission-denied', 
            'Invalid credentials'
        );
    }

    const agentData = query.docs[0].data();
    return {
        uid: query.docs[0].id,
        accessLevel: agentData.accessLevel || 'agent',
        customToken: await admin.auth().createCustomToken(query.docs[0].id)
    };
});