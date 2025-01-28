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

// Charger le fichier WSDL à partir du fichier
const wsdlFilePath = './user-service.wsdl';  
const wsdl = fs.readFileSync(wsdlFilePath, 'utf8');  /

const server = http.createServer((req, res) => {
  res.end('SOAP User Service is running');
});

server.listen(8000, () => {
  const serviceUrl = 'http://localhost:8000/user';
  soap.listen(server, '/user', userService, wsdl);
  console.log(`SOAP User Service running at ${serviceUrl}`);
});
