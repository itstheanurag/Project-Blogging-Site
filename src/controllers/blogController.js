const { default: mongoose } = require("mongoose")
const blogModel = require("../models/blogModel")


const createBlog = async function (req, res) {
  try {
    const blog = req.body;
    const {category, tags, subcategory} = blog

    if (tags) {

      if (Array.isArray(tags)) {
        const uniqueTagArr = [...new Set(tags)];
        blog["tags"] = uniqueTagArr; //Using array constructor here
      }
    }

    if (subcategory) {

      if (Array.isArray(subcategory)) {
        const uniqueSubcategoryArr = [...new Set(subcategory)];
        blog["subcategory"] = uniqueSubcategoryArr; //Using array constructor here
      }
    }

    if (!category) {
      return res.status(400).send({status : false, msg : "Category is a required"})
    }

    let findBlog = await blogModel.findOne(blog)
 
    if(findBlog){
      return res.status(400).send({status: false, msg : "this blog already exists, try updating it"})
    }
    
    let blogCreated = await blogModel.create(blog);

    if (blogCreated.isPublished === true) {
      let mainBlog = await blogModel.findOneAndUpdate(
        { _id: blogCreated._id },
        { $set: { publishedAt: Date.now() } },
        { new: true, upsert: true }
      );
      return res.status(201).send({ status: true, msg : "Your Blog has been Published", data: mainBlog })
    } else {
      return res.status(201).send({ status: true, msg : "Your Blog has been Saved in drafts", data: blogCreated })
    }

  } catch (err) {
    return res.status(500).send({ status: false, err: err.message });
  }
}







const getBlogs = async function (req, res) {
  try {
    let data = req.query;
    let filter = {
      isdeleted: false,
      isPublished: true,
      ...data
    };

    const { category, subcategory, tags } = data

    if (category) {
      let verifyCategory = await blogModel.findOne({ category: category })
      if (!verifyCategory) {
        return res.status(400).send({ status: false, msg: 'No blogs in this category exist' })
      }
    }

    if (tags) {

      if (!await blogModel.exists(tags)) {
        return res.status(400).send({ status: false, msg: 'no blog with this tags exist' })
      }
    }

    if (subcategory) {

      if (!await blogModel.exists(subcategory)) {
        return res.status(400).send({ status: false, msg: 'no blog with this subcategory exist' })
      }
    }

    let getSpecificBlogs = await blogModel.find(filter);

    if (getSpecificBlogs.length == 0) {
      return res.status(400).send({ status: false, data: "No blogs can be found" });
    } 
    else {
      return res.status(200).send({ status: true, data: getSpecificBlogs });
    }
  } 
    catch (error) {
    res.status(500).send({ status: false, err: error.message });
  }
};






const putBlog = async function(req, res) {

  try {
    let data = req.body
    let authorId = req.query.authorId
    let id = req.params.blogId
    
    if(!id){ 
        return res.status(400).send({status:false, msg :"blogId must be present in request param "})
    }

    if(!mongoose.isValidObjectId(id)){
      return res.status(400).send({status: false, msg: "Please provide a Valid blogId"})
    }


    let blogFound = await blogModel.findOne({_id : id})

    if(!blogFound){
      return res.status(400).send({status: false, msg : "No Blog with this Id exist"})
    }

    if(blogFound.authorId != authorId){
      return res.status(401).send({status : false, msg :"You are trying to perform an Unauthorized action"})
    }
    
    let updatedBlog = await blogModel.findOneAndUpdate({_id: id, authorId: authorId}, { $addToSet: { tags: data.tags, subcategory: data.subcategory }, $set: { title: data.title, body: data.body, category: data.category } }, { new: true, upsert : true })

    if (updatedBlog){
       return res.status(200).send({ status: true, data: updatedBlog })
    }
  }
  catch (error) {
    res.status(500).send(error.message)
  }
}






const deleteBlog = async function (req, res) {
  try {
    let blog = req.params.blogId
    let authorId = req.query.authorId

    
    if(!blog){
        return res.status(400).send({status : false, msg : "blogId must be present in order to delete it"})
    }
       
    if(!mongoose.isValidObjectId(blog)){
        return res.status(400).send({status: false, msg: "Please provide a Valid blogId"})
    }

    let blogFound = await blogModel.findOne({_id : blog})

    if (!blogFound) {
      return res.status(400).send({ status: false, msg: "No blog exists bearing this Blog Id, please provide another one" })
    }

    if(blogFound.authorId != authorId){
      return res.status(400).send({status : false, msg :"You are trying to perform an Unauthorized action"})
    }
  
    if(blogFound.isdeleted===true){
      return res.status(404).send({status:false,msg:"this blog has been deleted by You"})
     }

    let deletedBlog = await blogModel.findOneAndUpdate({_id : blog},
      { $set: { isdeleted: true }, deletedAt: Date.now() },
      { new: true }
    )

    if (deletedBlog) {
      return res.status(200).send({ status: true, msg: "Your Blog has been successfully deleted", deletedData: deletedBlog })
    }

  }
  catch (err) {
    res.status(500).send({ status: false, msg: err.message })
  }

}





const blogByQuery = async (req, res) => {
  try {
    const data = req.query;

    if (Object.keys(data) == 0){    
      return res.status(400).send({ status: false, message: "No input provided" });
    }

    const { authorId, category, subcategory, tags } = data
    
    if (category) {
      let verifyCategory = await blogModel.findOne({ category: category })
      if (!verifyCategory) {
        return res.status(400).send({ status: false, msg: 'No blogs in this category exist' })
      }
    }

    if (tags) {
      let verifytags = await blogModel.findOne({ tags: tags })
      if (!verifytags) {
        return res.status(400).send({ status: false, msg: 'no blog with this tags exist' })
      }
    }

    if (subcategory) {
      let verifysubcategory = await blogModel.findOne({ subcategory: subcategory })
      if (!verifysubcategory) {
        return res.status(400).send({ status: false, msg: 'no blog with this subcategory exist' })
      }
    }

    let findBlog = await blogModel.find({$and :[data, {isdeleted : false}, {authorId : authorId} ]})
    
    if(!findBlog){
      return res.status(400).send({status :false, msg : "no blogs are present with this query"})
    }

    const deleteByQuery = await blogModel.updateMany(data,{ isdeleted: true, deletedAt: new Date() },
      { new: true }               
    );

    if (deleteByQuery){
    res.status(200).send({ status: true, msg : "Your blogs have been deleted", data: deleteByQuery })
    }
} 
  catch (error) {
    res.status(500).send({ status: false, message: error.message });
  }
};



module.exports = { createBlog, getBlogs, putBlog, deleteBlog, blogByQuery }
