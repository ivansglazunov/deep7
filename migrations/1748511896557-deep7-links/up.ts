import dotenv from 'dotenv';
import { up } from '../../lib/.temp/up-links';

// Load environment variables from root .env file
dotenv.config();

// Run the migration
up(); 