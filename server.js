const express = require('express'); // Import Express for backend framework
const path = require('path'); // Import Path for handling static files
const MongoClient = require('mongodb').MongoClient; // Import MongoClient for MongoDB connection
const ObjectID = require('mongodb').ObjectID; //Import ObjectID to handle MongoDB document IDs

const app = express(); // Create an instance of Express

// Middleware Configuration
app.use(express.json()); // Parse incoming JSON requests
app.use(express.static("static")); // Serve static files
app.set('port', 3000); // Set the default port to 3000

// CORS Configuration
// Middleware for setting headers for CORS and allowed methods
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins
    res.setHeader('Access-Control-Allow-Credentials', "true");
    res.setHeader('Access-Control-Allow-Methods', "GET, HEAD, OPTIONS, POST, PUT");
    res.setHeader(
        'Access-Control-Allow-Headers',
        "Access-Control-Allow-Headers, Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers"
    );
    next(); // Proceed to the next middleware
});

// Database Connection
let db;
MongoClient.connect('mongodb+srv://JamalMar:Shon%40tives95@cluster0.vr3h8ps.mongodb.net', (err, client) => {
    if (err) {
        console.error("Error connecting to MongoDB:", err);
        process.exit(1); // Exit if the connection fails
    }
    db = client.db('webStore'); // Connect to the "webStore" database
    console.log("Connected to MongoDB successfully.");
});

// Routes

// Root Route
app.get('/', (req, res) => {
    console.log("Root endpoint accessed.");
    res.send('Select a collection, e.g., /collection/messages');
});

// Image Serving Route
app.get("/images/:image", (req, res) => {
    res.sendFile(path.join(__dirname, "static", "index.html"));
});

// Parameter Middleware
// Handles dynamic collection names in routes
app.param('collectionName', (req, res, next, collectionName) => {
    req.collection = db.collection(collectionName); // Bind the collection to the request
    next();
});

// Fetch All Documents in a Collection
app.get('/collection/:collectionName', (req, res, next) => {
    req.collection.find({}).toArray((err, results) => {
        if (err) {
            console.error("Error fetching documents:", err);
            return next(err);
        }
        console.log(`Fetched ${results.length} documents from ${req.params.collectionName}`);
        res.send(results); // Return all documents as JSON
    });
});

// Fetch a Single Document by ID
app.get('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.findOne({ _id: new ObjectID(req.params.id) }, (err, result) => {
        if (err) {
            console.error("Error fetching document:", err);
            return next(err);
        }
        console.log(`Fetched document from ${req.params.collectionName}:`, result);
        res.send(result); // Return the document as JSON
    });
});

// Search Functionality
app.get('/search', (req, res, next) => {
    const { query } = req.query; // Extract search query from the request
    const regex = new RegExp(query, 'i'); // Create a case-insensitive regex for partial matching

    db.collection('curriculums') // Target the 'curriculums' collection
        .find({ $or: [{ subject: regex }, { location: regex }] }) // Match either subject or location fields
        .toArray((err, results) => {
            if (err) return next(err);
            res.send(results); // Send the matching results back as JSON
        });
});

// Insert a Document into a Collection
app.post('/collection/:collectionName', async (req, res, next) => {
    try {
        const { collectionName } = req.params;

        if (collectionName === 'orders') {
            // Handle orders specifically
            const { orderedItems } = req.body;

            // Update available spaces in curriculums
            const updates = orderedItems.map(async (item) => {
                await db.collection('curriculums').updateOne(
                    { id: item.id },
                    { $inc: { spaces: -item.quantity } } // Decrease spaces
                );
            });

            // Wait for all updates to complete
            await Promise.all(updates);

            // Insert the order into the orders collection
            const result = await req.collection.insertOne(req.body);
            console.log("Order inserted successfully:", result.ops[0]);
            return res.send(result.ops[0]); // Return the inserted order
        }

        // Default behavior for other collections
        const result = await req.collection.insertOne(req.body);
        console.log(`Document inserted into ${collectionName} collection:`, result.ops[0]);
        res.send(result.ops[0]);
    } catch (err) {
        console.error("Error inserting document:", err);
        next(err);
    }
});

// Update a Document by ID
app.put('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.updateOne(
        { _id: new ObjectID(req.params.id) },
        { $set: req.body }, // Update fields
        { safe: true, multi: false },
        (err, result) => {
            if (err) {
                console.error("Error updating document:", err);
                return next(err);
            }
            console.log(`Updated document in ${req.params.collectionName}:`, req.body);
            res.send(result.modifiedCount === 1 ? { msg: 'success' } : { msg: 'error' });
        }
    );
});

// Delete a Document by ID
app.delete('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.deleteOne({ _id: ObjectID(req.params.id) }, (err, result) => {
        if (err) {
            console.error("Error deleting document:", err);
            return next(err);
        }
        console.log(`Deleted document from ${req.params.collectionName}`);
        res.send(result.deletedCount === 1 ? { msg: 'success' } : { msg: 'error' });
    });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err); // Log the error
    res.status(500).send({ error: 'Something went wrong!' }); // Respond with a generic error
});

// Start the Server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
