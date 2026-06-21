const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = process.env.MONGO_DB_URI;
const app = express();
const port = process.env.PORT;
const cors = require("cors");

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const database = client.db("startupForge");
    const startupCollection = database.collection("startups");

    // const { ObjectId } = require("mongodb");
    // app.get('/api/startups', async (req, res) => {
    //   const query = {};
    //   if (req.query._id) {
    //     query._id = new ObjectId(req.query._id);
    //   }

    //   const cursor = startupCollection.find(query);
    //   const result = await cursor.toArray();
    //   res.send(result);
    // });
    const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
    app.get("/api/startups", async (req, res) => {
      const result = await startupCollection.find().toArray();
      res.json(result);
    });

    app.post("/api/startups", async (req, res) => {
      const startup = req.body;
      const result = await startupCollection.insertOne(startup);
      res.send(result);
    });

    app.delete("/api/startups/:id", async (req, res) => {
      const { id } = req.params;

      const result = await startupCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    app.patch("/api/startups/:id", async (req, res) => {
      const { id } = req.params;

        const { _id, ...updatedStartup } = req.body;

      const result = await startupCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            ...updatedStartup
          },
        },
      );

      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
