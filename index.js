const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5008;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

//middleware
app.use(cors({
  origin:['http://localhost:5173'],
  credentials:true
}));
app.use(express.json());
app.use(cookieParser())


//created middleware
const verifyToken = async(req, res, next) =>{
  const token = req.cookies?.token;
  console.log('value of token', token);
  if (!token) {
    return res.status(401).send({message: 'Unauthorized'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN,(error, decoded) =>{
    if (error) {
      console.log(error);
      return res.status(401).send({message: 'Unauthorized'})
    }
    console.log('value in the token', decoded);
    req.user = decoded;
    next()
  })

}


console.log(process.env.DB_PASS);






// const uri = 'mongodb+srv://carDoctor:j0G9gLE55SUWixst@cluster0.9gtpze4.mongodb.net/?retryWrites=true&w=majority';
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9gtpze4.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const servicesCollection = client.db('carDoctor').collection('services');
    const bookingsCollection = client.db('carDoctor').collection('bookings');

    //auth related api
    app.post('/jwt', async(req, res) =>{
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {expiresIn : '24h'})
      res
      .cookie('token', token,{
        httpOnly:'true',
        secure:'false',
        sameSite:'none'
      } )
      .send({success:true})
    })


    //service related api
    app.get('/services', async(req, res) =>{
        const cursor = servicesCollection.find();
        const result = await cursor.toArray();
        res.send(result)
    })

    //
    app.get('/services/:id', async(req, res) =>{
        const id = req.params.id;
        const query ={_id: new ObjectId(id)}
        const result = await servicesCollection.findOne(query);
        res.send(result)

    })

    // //bookings
    app.get('/bookings',verifyToken, async(req, res) =>{
        // console.log(req.query.email);
        // console.log('tokennnn', req.cookies.token);
        if (req.query.email !== req.user.email) {
          return res.status(403).send({message:'forbidden access'})
        }
        let query ={}
        if (req.query?.email) {
            query = {email : req.query.email}
        }
        const result = await bookingsCollection.find(query).toArray()
        res.send(result)
    })


    app.post('/bookings', async (req,res) =>{
        const bookings = req.body
        console.log(bookings);
        const result = await bookingsCollection.insertOne(bookings);
        res.send(result)
    })

    app.patch('/bookings/:id', async(req, res) =>{
        const updateBookings = req.body;
        const id = req.params.id
        const filter = {_id: new ObjectId(id)}
        console.log(updateBookings);
        const updateDoc = {
            $set: {
              status: updateBookings.status
            },
          };
        const result = await bookingsCollection.updateOne(filter, updateDoc)
        res.send(result)
    })
    app.delete('/bookings/:id' ,async(req, res) =>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await bookingsCollection.deleteOne(query)
        res.send(result)
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) =>{
    res.send('Car doctor server is running')
});

app.listen(port, () =>{
    console.log(`Car Doctor server is running on port:${port}`);
})



