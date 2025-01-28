const http = require('http');
const soap = require('soap');
const mongoose = require('mongoose');
const fs = require('fs'); 

// Connexion à MongoDB
mongoose.connect('mongodb://localhost:27017/soapServiceDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phoneNumber: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

const postSchema = new mongoose.Schema({
    content: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
  });
  
  const Post = mongoose.model('Post', postSchema);
  
// Définir les fonctions de service
const userService = {
  UserService: {
    UserPort: {
      // Récupérer les détails d'un utilisateur
      getUserDetails: async function (args) {
        try {
          console.log("Received userId:", args.userId); 
          const user = await User.findById(args.userId).exec();
          if (user) {
            return {
              fullName: user.fullName,
              email: user.email,
              phoneNumber: user.phoneNumber,
            };
          } else {
            throw {
              Fault: {
                Code: { Value: 'soap:Client' },
                Reason: { Text: 'User not found' },
              },
            };
          }
        } catch (error) {
          throw {
            Fault: {
              Code: { Value: 'soap:Server' },
              Reason: { Text: 'Internal server error' },
            },
          };
        }
      },

      // Lister tous les utilisateurs
      listUsers: async function () {
        try {
          const users = await User.find().exec();  
          if (users.length > 0) {
            // Retourne une liste d'utilisateurs avec leurs informations
            return {
              users: users.map(user => ({
                userId: user._id.toString(),
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber,
              })),
            };
          } else {
            throw {
              Fault: {
                Code: { Value: 'soap:Client' },
                Reason: { Text: 'No users found' },
              },
            };
          }
        } catch (error) {
          throw {
            Fault: {
              Code: { Value: 'soap:Server' },
              Reason: { Text: 'Internal server error' },
            },
          };
        }
      },

      // Ajouter un nouvel utilisateur
      addUser: async function (args) {
        const newUser = new User({
          fullName: args.fullName,
          email: args.email,
          phoneNumber: args.phoneNumber,
        });
        await newUser.save();
        return { userId: newUser._id.toString() };
      },

      // Mettre à jour un utilisateur
      updateUser: async function (args) {
        try {
          const user = await User.findById(args.userId).exec();
          if (user) {
            user.fullName = args.fullName || user.fullName;
            user.email = args.email || user.email;
            user.phoneNumber = args.phoneNumber || user.phoneNumber;

            await user.save();
            return {
              userId: user._id.toString(),
              fullName: user.fullName,
              email: user.email,
              phoneNumber: user.phoneNumber,
            };
          } else {
            throw {
              Fault: {
                Code: { Value: 'soap:Client' },
                Reason: { Text: 'User not found' },
              },
            };
          }
        } catch (error) {
          throw {
            Fault: {
              Code: { Value: 'soap:Server' },
              Reason: { Text: 'Internal server error' },
            },
          };
        }
      },

      // Supprimer un utilisateur
      deleteUser: async function (args) {
        try {
          const user = await User.findByIdAndDelete(args.userId).exec();
          if (user) {
            return { message: 'User deleted successfully' };
          } else {
            throw {
              Fault: {
                Code: { Value: 'soap:Client' },
                Reason: { Text: 'User not found' },
              },
            };
          }
        } catch (error) {
          throw {
            Fault: {
              Code: { Value: 'soap:Server' },
              Reason: { Text: 'Internal server error' },
            },
          };
        }
      },
    },
  },
};

const postService = {
    PostService: {
      PostPort: {
        // Ajouter un post
        addPost: async function (args) {
          const newPost = new Post({
            content: args.content,
            userId: args.userId, // Lier le post à un utilisateur
          });
          await newPost.save();
          return { postId: newPost._id.toString() };
        },
  
        // Lister tous les posts d'un utilisateur
        listPosts: async function (args) {
          try {
            const posts = await Post.find({ userId: args.userId }).exec(); 
            if (posts.length > 0) {
              return {
                posts: posts.map(post => ({
                  postId: post._id.toString(),
                  content: post.content,
                  createdAt: post.createdAt,
                })),
              };
            } else {
              throw {
                Fault: {
                  Code: { Value: 'soap:Client' },
                  Reason: { Text: 'No posts found for this user' },
                },
              };
            }
          } catch (error) {
            throw {
              Fault: {
                Code: { Value: 'soap:Server' },
                Reason: { Text: 'Internal server error' },
              },
            };
          }
        },
  
        // Supprimer un post
        deletePost: async function (args) {
          try {
            const post = await Post.findByIdAndDelete(args.postId).exec();
            if (post) {
              return { message: 'Post deleted successfully' };
            } else {
              throw {
                Fault: {
                  Code: { Value: 'soap:Client' },
                  Reason: { Text: 'Post not found' },
                },
              };
            }
          } catch (error) {
            throw {
              Fault: {
                Code: { Value: 'soap:Server' },
                Reason: { Text: 'Internal server error' },
              },
            };
          }
        },
      },
    },
  };
  
// Load WSDL files for user and post services
const userWsdlFilePath = './user-service.wsdl';
const postWsdlFilePath = './post-service.wsdl';

const userWsdl = fs.readFileSync(userWsdlFilePath, 'utf8');
const postWsdl = fs.readFileSync(postWsdlFilePath, 'utf8');

// Create the HTTP server for user service
const userServer = http.createServer((req, res) => {
    res.end('SOAP User Service is running');
  });
  
  // Create the HTTP server for post service
  const postServer = http.createServer((req, res) => {
    res.end('SOAP Post Service is running');
  });
  
  // Start user service on port 8000
  userServer.listen(8000, () => {
    soap.listen(userServer, '/user', userService, userWsdl);
    console.log('SOAP User Service running at http://localhost:8000/user');
  });
  
  // Start post service on port 8001
  postServer.listen(8001, () => {
    soap.listen(postServer, '/post', postService, postWsdl);
    console.log('SOAP Post Service running at http://localhost:8001/post');
  });