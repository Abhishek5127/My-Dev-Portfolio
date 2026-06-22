import React from 'react';
import release from "@/app/assets/export"
import Image from 'next/image';
import BouncyBlob from './BouncyBlob';

const Links = [
  {
    platform: "Github",
    link: "https://github.com/abhishek5127",
    icon: release.Github
  },
  {
    platform: "Linkedin",
    link: "https://linkedin.com/abhishek5127",
    icon: release.Linkedin
  },
  {
    platform: "GMail",
    link: "abhishek.gajraj555@gmail.com",
    icon: release.Gmail
  },
  {
    platform: "Instagram",
    link: "",
    icon: release.Instagram
  }
];

const NavComponent = () => {
  return (
    <div>
      <BouncyBlob className="w-70 h-15 select-none rounded-full cursor-pointer border p-3 border-2 bg-black text-white flex justify-around items-center">
        {Links.map((item, index) => (
          <div key={index} className="relative z-10">
            <Image
            className='invert'
            src={item.icon}
            height={30}
            width={30}
            alt='bubblieIcon'
            />
          </div>
        ))}
      </BouncyBlob>
    </div>
  );
};

export default NavComponent;

