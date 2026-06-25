const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = process.env.MONGO_DB_URI;
const app = express();
const port = process.env.PORT;
const cors = require("cors");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

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

    const db = client.db("startupForge");

    const startupCollection = db.collection("startups");
    const opportunityCollection = db.collection("opportunities");
    const applicationCollection = db.collection("applications");
    const plansCollection = db.collection("plans");
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

   const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`));

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    console.log("Decoded payload:", payload);
    req.user = payload;
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

    // Startup Api
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
            ...updatedStartup,
          },
        },
      );

      res.send(result);
    });

    // Opportunity Api

    app.post("/api/opportunities", async (req, res) => {
      try {
        const opportunity = req.body;

        opportunity.createdAt = new Date();

        const result = await opportunityCollection.insertOne(opportunity);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error creating opportunity:", error);
        res
          .status(500)
          .send({ success: false, message: "Internal Server Error" });
      }
    });

    app.get("/api/opportunities", async (req, res) => {
      try {
        const { search, workType, industry } = req.query;

        const query = {};

        // Search by title or skills
        if (search) {
          query.$or = [
            {
              title: {
                $regex: search,
                $options: "i",
              },
            },
            {
              skills: {
                $elemMatch: {
                  $regex: search,
                  $options: "i",
                },
              },
            },
          ];
        }

        // Filter by work type
        if (workType) {
          query.workType = {
            $in: workType.split(","),
          };
        }

        // Filter by industry
        if (industry) {
          query.industry = {
            $in: industry.split(","),
          };
        }

        const result = await opportunityCollection
          .find(query)
          .sort({ createdAt: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        console.error("Error fetching opportunities:", error);
        res.status(500).send({
          success: false,
          message: "Internal Server Error",
        });
      }
    });

    app.patch("/api/opportunities/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { _id, ...updatedOpportunity } = req.body;

        const result = await opportunityCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              ...updatedOpportunity,
            },
          },
        );

        res.send(result);
      } catch (error) {
        console.error("Error updating opportunity:", error);
        res
          .status(500)
          .send({ success: false, message: "Internal Server Error" });
      }
    });

    app.delete("/api/opportunities/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const result = await opportunityCollection.deleteOne({
          _id: new ObjectId(id),
        });

        res.send(result);
      } catch (error) {
        console.error("Error deleting opportunity:", error);
        res
          .status(500)
          .send({ success: false, message: "Internal Server Error" });
      }
    });

    // applications api

    app.post("/api/applications", async (req, res) => {
      try {
        const applicationData = req.body;

        if (!applicationData.opportunityId || !applicationData.applicantId) {
          return res.status(400).json({ error: "Missing required fields" });
        }

        const result = await db.collection("applications").insertOne({
          ...applicationData,
          status: "pending",
          appliedAt: new Date(),
        });

        res.status(201).json({ success: true, id: result.insertedId });
      } catch (error) {
        console.error("Error inserting application:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    app.get("/api/applications", async (req, res) => {
      try {
        const query = {};
        if (req.query.applicantId) {
          query.applicantId = req.query.applicantId;
        }
        if (req.query.founderId) {
          query.founderId = req.query.founderId;
        }
        if (req.query.opportunityId) {
          query.opportunityId = req.query.opportunityId;
        }
        const result = await applicationCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching applications:", error);
        res
          .status(500)
          .send({ success: false, message: "Internal Server Error" });
      }
    });

    app.patch("/api/applications/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { _id, ...updatedApplication } = req.body;

        const result = await applicationCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              ...updatedApplication,
            },
          },
        );

        res.send(result);
      } catch (error) {
        console.error("Error updating application:", error);
        res
          .status(500)
          .send({ success: false, message: "Internal Server Error" });
      }
    });

    // startup-details api

    app.get("/api/startups/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const startup = await db
          .collection("startups")
          .findOne({ _id: new ObjectId(id) });

        if (!startup) {
          return res.status(404).json({ error: "Startup not found" });
        }

        res.status(200).json(startup);
      } catch (error) {
        console.error("Error fetching startup details:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // opportunity details api

    app.get("/api/opportunities/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .json({ error: "Invalid opportunity ID format" });
        }

        const opportunity = await db
          .collection("opportunities")
          .findOne({ _id: new ObjectId(id) });

        if (!opportunity) {
          return res.status(404).json({ error: "Opportunity not found" });
        }

        res.status(200).json(opportunity);
      } catch (error) {
        console.error("Error fetching opportunity details:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    app.get("/api/plans", async (req, res) => {
      const query = {};
      if (req.query.plan_id) {
        query.plan_id = req.query.plan_id;
      }
      const plan = await plansCollection.findOne(query);
      res.json(plan || {});
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
