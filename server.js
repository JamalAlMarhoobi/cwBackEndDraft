const express = require('express')
const path = require('path'); // Import Path to handle static files
const app = express()

app.use(express.json())
app.use(express.static("static"));
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
    if (err) {
        console.error("Error connecting to MongoDB:", err); // Log connection errors
        process.exit(1); // Exit the process if the connection fails
    }
    db = client.db('webStore');
    console.log("Connected to MongoDB successfully."); // Log successful connection
});

app.get("/images/:image", (req, res) => {
    res.sendFile(path.join(__dirname, "static", "index.html"));
});

app.get('/', (req, res, next) => {
    console.log("Root endpoint accessed"); // Log root access
    res.send('Select a collection, e.g., /collection/messages');
});

app.param('collectionName', (req, res, next, collectionName) => {
    req.collection = db.collection(collectionName);
    return next();
});

app.get('/collection/:collectionName', (req, res, next) => {
    req.collection.find({}).toArray((err, results) => {
        if (err) {
            console.error("Error fetching documents:", err); // Log fetch errors
            return next(err); // Pass the error to the error-handling middleware
        }
        console.log(`Fetched ${results.length} documents from ${req.params.collectionName}`); // Log the number of documents fetched
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
            console.log("Order inserted successfully:", result.ops[0]); // Log the inserted order
            return res.send(result.ops[0]);
        }

        // Default insert behavior
        const result = await req.collection.insertOne(req.body);
        console.log(`Document inserted into ${collectionName} collection:`, result.ops[0]); // Log the inserted document
        res.send(result.ops[0]);
    } catch (err) {
        console.error("Error inserting document:", err); // Log insertion errors
        next(err);
    }
});

app.get('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.findOne({ _id: new ObjectID(req.params.id) }, (err, result) => {
        if (err) {
            console.error("Error fetching document:", err); // Log fetch errors
            return next(err); // Pass the error to the error-handling middleware
        }
        console.log(`Fetched document from ${req.params.collectionName}:`, result); // Log the fetched document
        res.send(result);
    });
});

app.put('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.updateOne({ _id: new ObjectID(req.params.id) }, { $set: req.body }, { safe: true, multi: false }, (err, result) => {
        if (err) {
            console.error("Error updating document:", err); // Log update errors
            return next(err); // Pass the error to the error-handling middleware
        }
        console.log(`Updated document in ${req.params.collectionName}:`, req.body); // Log the updated document
        res.send(result.modifiedCount === 1 ? { msg: 'success' } : { msg: 'error' });
    });
});

app.delete('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.deleteOne({ _id: ObjectID(req.params.id) }, (err, result) => {
        if (err) {
            console.error("Error deleting document:", err); // Log deletion errors
            return next(err); // Pass the error to the error-handling middleware
        }
        console.log(`Deleted document from ${req.params.collectionName}`); // Log the deletion
        res.send(result.deletedCount === 1 ? { msg: 'success' } : { msg: 'error' });
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));