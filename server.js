const express = require('express')

const app = express()

app.use(express.json())
app.set('port', 3000)

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', "true");
    res.setHeader('Access-Control-Allow-Methods', "GET, HEAD, OPTIONS, POST, PUT");
    res.setHeader('Access-Control-Allow-Headers', "Access-Control-Allow-Headers, Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");

    next();
})

const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;

let db;

MongoClient.connect('mongodb+srv://JamalMar:Shon%40tives95@cluster0.vr3h8ps.mongodb.net', (err, client) => {
    if (err) throw err;
    db = client.db('webStore');
});

app.get('/', (req, res, next) => {
    res.send('Select a collection, e.g., /collection/messages');
});

app.param('collectionName', (req, res, next, collectionName) => {
    req.collection = db.collection(collectionName);
    return next();
});

app.get('/collection/:collectionName', (req, res, next) => {
    req.collection.find({}).toArray((e, results) => {
        if (e) return next(e);
        res.send(results);
    });
});

app.post('/collection/:collectionName', async (req, res, next) => {
    try {
        const { collectionName } = req.params;

        // Insert the order into the "orders" collection
        if (collectionName === 'orders') {
            const { orderedItems } = req.body;

            // Update available spaces in curriculums
            const updates = orderedItems.map(async (item) => {
                await db.collection('curriculums').updateOne(
                    { id: item.id },
                    { $inc: { spaces: -item.quantity } }
                );
            });

            // Wait for all updates to complete
            await Promise.all(updates);

            // Insert the order into the orders collection
            const result = await req.collection.insertOne(req.body);

            return res.send(result.ops[0]);
        }

        // Default insert behavior
        const result = await req.collection.insertOne(req.body);
        res.send(result.ops[0]);
    } catch (e) {
        next(e);
    }
});

app.get('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.findOne({ _id: new ObjectID(req.params.id) }, (e, result) => {
        if (e) return next(e);
        res.send(result);
    });
});

app.put('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.updateOne({ _id: new ObjectID(req.params.id) }, { $set: req.body }, { safe: true, multi: false }, (e, result) => {
        if (e) return next(e);
        res.send(result.modifiedCount === 1 ? { msg: 'success' } : { msg: 'error' });
    });
});

app.delete('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.deleteOne({ _id: ObjectID(req.params.id) }, (e, result) => {
        if (e) return next(e);
        res.send(result.deletedCount === 1 ? { msg: 'success' } : { msg: 'error' });
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));