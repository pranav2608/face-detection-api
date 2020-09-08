const express =  require("express")
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt-nodejs");
const cors = require("cors");
const knex  = require("knex");
const { response } = require("express");

//initialize and configure knex package for postgre
const db = knex({
    client: 'pg',
    connection: {
      host : '127.0.0.1',
      user : 'postgres',
      password : 'abpa567y',
      database : 'postgres'
    }
  }
);  
const app = express();

app.use(bodyParser.json());
app.use(cors());


app.post("/signin", (req,res)=>{
    db.select("email","hash").from('login')
    .where('email', '=',req.body.email)
    .then(data =>{
        const isValid = bcrypt.compareSync(req.body.password,data[0].hash);
        if(isValid){
         return db.select("*").from("users")
            .where("email","=", req.body.email)
            .then(user =>{
                res.json(user[0])
            })
            .catch(err => {res.status(400).json("Unable to Get users")})
        }else{
          res.status(400).json("Wrong Password,Try Again")
        }
    })
    .catch(err=> {res.status(400).json("Wrong Credentials")})
})

app.post("/register", (req,res)=>{
    const {email,name,password} = req.body;
    if(!email || !name || !password){
        return res.status(400).json("Please Fill The Form!")
    }
    const hash = bcrypt.hashSync(password) //to encrypt the password
    db.transaction(trx=>{     //transactions are to work with multiple tables with some relations bw them
        trx.insert({
            hash:hash,
            email:email
        })
        .into('login')
        .returning('email')
        .then(loginEmail=>{
            return trx('users')
            .returning("*")
            .insert({
                email:loginEmail[0],
                name:name,
                joined:new Date()
            })
            .then(user =>{
                res.json(user[0])
            })
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })
    .catch(err=>{res.status(400).json("Could Not Register")})
    
})

app.get("/profile/:id", (req,res)=>{
    const id = req.params.id;
    db.select("*").from("users").where({
        id:id,
    }).then(user=> {
        if(user.length){
            res.json(user[0])
        }else{
            res.status(400).json("Not Found!")
        }
    })
    .catch(err=> res.status(400).json("Error finding users"))
})

app.put("/image", (req,res)=>{
    const id = req.body.id;
    db('users').where("id","=", id)
    .increment("entries",1)
    .returning("entries")
    .then(entries=>{
        res.json(entries[0])
    })
    .catch(err=>{
        res.status(400).json("Unable To fetch entries")
    })

})


app.listen(process.env.PORT || 3004, ()=>{
    console.log(`Server started at port ${process.env.PORT}`)
})
